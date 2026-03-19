import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { errorResponse, errors, successResponse } from '@/lib/api-response';
import { hasSystemAccess, PROJECT_MANAGE_ROLES } from '@/lib/project-access';

const updatePageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  path: z.string().min(1).max(500).optional(),
});

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

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        system: {
          select: { id: true, name: true, projectId: true },
        },
      },
    });

    if (!page) {
      return errors.notFound('页面');
    }

    const canAccessPage = await hasSystemAccess(session.user.id, page.systemId);
    if (!canAccessPage) {
      return errors.forbidden();
    }

    return successResponse(page);
  } catch (error) {
    console.error('Get page error:', error);
    return errorResponse('获取页面失败', 500);
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

    const validationResult = updatePageSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const existing = await prisma.page.findUnique({
      where: { id },
      select: { id: true, systemId: true },
    });
    if (!existing) {
      return errors.notFound('页面');
    }

    const canManagePage = await hasSystemAccess(
      session.user.id,
      existing.systemId,
      PROJECT_MANAGE_ROLES
    );
    if (!canManagePage) {
      return errors.forbidden();
    }

    const updated = await prisma.page.update({
      where: { id },
      data: validationResult.data,
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update page error:', error);
    return errorResponse('更新页面失败', 500);
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

    const existing = await prisma.page.findUnique({
      where: { id },
      select: { id: true, systemId: true },
    });
    if (!existing) {
      return errors.notFound('页面');
    }

    const canManagePage = await hasSystemAccess(
      session.user.id,
      existing.systemId,
      PROJECT_MANAGE_ROLES
    );
    if (!canManagePage) {
      return errors.forbidden();
    }

    await prisma.page.delete({ where: { id } });
    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete page error:', error);
    return errorResponse('删除页面失败', 500);
  }
}
