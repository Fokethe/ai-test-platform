import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { errorResponse, errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess, MANAGE_ROLES } from '@/lib/project-access';

const updateSystemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().min(1).max(500).optional(),
});

async function getSystemBase(systemId: string) {
  return prisma.system.findUnique({
    where: { id: systemId },
    select: { id: true, projectId: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const systemBase = await getSystemBase(id);
    if (!systemBase) {
      return errors.notFound('系统');
    }

    const canAccessSystem = await hasProjectAccess(session.user.id, systemBase.projectId);
    if (!canAccessSystem) {
      return errors.forbidden();
    }

    const system = await prisma.system.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        pages: {
          select: { id: true, name: true, path: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!system) {
      return errors.notFound('系统');
    }

    return successResponse(system);
  } catch (error) {
    console.error('Get system error:', error);
    return errorResponse('获取系统详情失败', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = updateSystemSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const systemBase = await getSystemBase(id);
    if (!systemBase) {
      return errors.notFound('系统');
    }

    const canManageSystem = await hasProjectAccess(
      session.user.id,
      systemBase.projectId,
      MANAGE_ROLES
    );
    if (!canManageSystem) {
      return errors.forbidden();
    }

    const { name, baseUrl } = validationResult.data;
    const updated = await prisma.system.update({
      where: { id },
      data: {
        name,
        baseUrl,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update system error:', error);
    return errorResponse('更新失败', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const systemBase = await getSystemBase(id);
    if (!systemBase) {
      return errors.notFound('系统');
    }

    const canManageSystem = await hasProjectAccess(
      session.user.id,
      systemBase.projectId,
      MANAGE_ROLES
    );
    if (!canManageSystem) {
      return errors.forbidden();
    }

    await prisma.system.delete({ where: { id } });
    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete system error:', error);
    return errorResponse('删除失败', 500);
  }
}
