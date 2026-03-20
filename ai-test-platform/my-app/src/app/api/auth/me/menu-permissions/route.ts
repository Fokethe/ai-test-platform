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
  const roleMenuPermissionModel = (
    prisma as typeof prisma & {
      roleMenuPermission?: {
        findMany: (args: {
          where: { role: string };
          select: { menuKey: true; enabled: true };
        }) => Promise<Array<{ menuKey: string; enabled: boolean }>>;
      };
    }
  ).roleMenuPermission;

  const rows = roleMenuPermissionModel
    ? await roleMenuPermissionModel.findMany({
        where: { role },
        select: {
          menuKey: true,
          enabled: true,
        },
      })
    : [];

  return successResponse({
    role,
    menuKeys: resolveMenuKeysForRole(role, rows),
  });
}
