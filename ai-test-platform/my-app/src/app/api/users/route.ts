import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { generateTempPassword } from '@/lib/security/password';
import { isUserRole } from '@/lib/rbac';

async function sendInvitationEmail(email: string, userId: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email] Invitation sent to ${email} (User ID: ${userId})`);
  }
}

async function ensureAdminAccess(targetId: string) {
  const session = await auth();
  if (!session?.user) {
    return { session, response: errors.unauthorized() };
  }

  if (session.user.role !== 'ADMIN') {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'FORBIDDEN_USER_MANAGEMENT',
      target: 'User',
      targetId,
      metadata: { role: session.user.role },
    });
    return { session, response: errors.forbidden() };
  }

  return { session, response: null as Response | null };
}

export async function GET(request: NextRequest) {
  const { response } = await ensureAdminAccess('list');
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(users);
}

export async function POST(request: NextRequest) {
  const { session, response } = await ensureAdminAccess('invite');
  if (response) {
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const email =
    typeof (body as { email?: unknown })?.email === 'string'
      ? (body as { email: string }).email.trim().toLowerCase()
      : '';
  const name =
    typeof (body as { name?: unknown })?.name === 'string'
      ? (body as { name: string }).name.trim()
      : '';
  const roleInput = (body as { role?: unknown })?.role;
  const role = isUserRole(roleInput) ? roleInput : 'USER';

  if (!email) {
    return errors.badRequest('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errors.badRequest('Invalid email format');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return errors.conflict('Email already registered');
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      role,
      status: 'INACTIVE',
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await sendInvitationEmail(email, user.id);
  await writeAuditLog({
    actorId: session!.user.id,
    action: 'USER_INVITED',
    target: 'User',
    targetId: user.id,
    metadata: {
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });

  return successResponse(user, 'Invitation sent successfully');
}

