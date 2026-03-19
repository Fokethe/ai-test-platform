import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { normalizeRole, resolveMenuKeysForRole } from '@/lib/rbac';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return errors.unauthorized();
  }

  const role = normalizeRole(session.user.role);
  const rows = await prisma.roleMenuPermission.findMany({
    where: { role },
    select: {
      menuKey: true,
      enabled: true,
    },
  });

  return successResponse({
    role,
    menuKeys: resolveMenuKeysForRole(role, rows),
  });
}
