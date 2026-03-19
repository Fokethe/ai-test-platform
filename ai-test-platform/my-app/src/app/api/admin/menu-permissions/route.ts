import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import {
  MENU_DEFINITIONS,
  MENU_KEYS,
  ROLE_VALUES,
  type AppUserRole,
  isUserRole,
  normalizeRole,
  resolveMenuKeysForRole,
  sanitizeMenuKeys,
} from '@/lib/rbac';

async function ensureAdminSession(targetId: string) {
  const session = await auth();
  if (!session?.user) {
    return { session, response: errors.unauthorized() };
  }

  if (session.user.role !== 'ADMIN') {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'FORBIDDEN_MENU_PERMISSION_WRITE',
      target: 'RoleMenuPermission',
      targetId,
      metadata: { role: session.user.role },
    });
    return { session, response: errors.forbidden() };
  }

  return { session, response: null as Response | null };
}

async function getRoleMenuMatrix(targetRole?: AppUserRole) {
  const where = targetRole ? { role: targetRole } : undefined;
  const records = await prisma.roleMenuPermission.findMany({
    where,
    select: {
      role: true,
      menuKey: true,
      enabled: true,
    },
  });

  const matrix: Record<AppUserRole, string[]> = {
    ADMIN: [],
    USER: [],
    GUEST: [],
  };

  for (const role of ROLE_VALUES) {
    const roleRows = records.filter((row) => row.role === role);
    matrix[role] = resolveMenuKeysForRole(role, roleRows);
  }

  if (targetRole) {
    return {
      role: targetRole,
      menuKeys: matrix[targetRole],
      matrix: { [targetRole]: matrix[targetRole] },
    };
  }

  return {
    matrix,
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const roleQuery = url.searchParams.get('role');
  const role = roleQuery ? normalizeRole(roleQuery) : undefined;

  const { response } = await ensureAdminSession(role ?? 'all');
  if (response) {
    return response;
  }

  const data = await getRoleMenuMatrix(role);
  return successResponse({
    roles: ROLE_VALUES,
    menus: MENU_DEFINITIONS,
    ...data,
  });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const role = isUserRole((body as { role?: unknown })?.role)
    ? (body as { role: AppUserRole }).role
    : null;
  if (!role) {
    return errors.badRequest('Invalid role');
  }

  const { session, response } = await ensureAdminSession(role);
  if (response) {
    return response;
  }

  const menuKeys = sanitizeMenuKeys((body as { menuKeys?: unknown })?.menuKeys);
  const desired = new Set(menuKeys);
  const roleRows = MENU_KEYS.map((menuKey) => ({
    role,
    menuKey,
    enabled: desired.has(menuKey),
    updatedBy: session!.user.id,
  }));

  await prisma.$transaction([
    prisma.roleMenuPermission.deleteMany({ where: { role } }),
    prisma.roleMenuPermission.createMany({ data: roleRows }),
  ]);

  await writeAuditLog({
    actorId: session!.user.id,
    action: 'ROLE_MENU_PERMISSION_UPDATED',
    target: 'RoleMenuPermission',
    targetId: role,
    metadata: {
      menuKeys,
      menuCount: menuKeys.length,
    },
  });

  const data = await getRoleMenuMatrix(role);
  return successResponse({
    roles: ROLE_VALUES,
    menus: MENU_DEFINITIONS,
    ...data,
  });
}
