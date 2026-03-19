import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
  successResponse,
} from '@/lib/api-response';
import { hasSystemAccess, PROJECT_MANAGE_ROLES } from '@/lib/project-access';

const createPageSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
  systemId: z.string().min(1),
});

const updatePagesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  data: z
    .object({
      name: z.string().min(1).max(100).optional(),
      path: z.string().min(1).max(500).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: '更新数据不能为空',
    }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const where: Prisma.PageWhereInput = {};
    if (systemId) {
      const canAccessSystem = await hasSystemAccess(session.user.id, systemId);
      if (!canAccessSystem) {
        return errors.forbidden();
      }
      where.systemId = systemId;
    } else {
      where.system = {
        project: {
          OR: [
            {
              members: {
                some: { userId: session.user.id },
              },
            },
            {
              workspace: {
                members: {
                  some: { userId: session.user.id },
                },
              },
            },
            {
              workspace: {
                ownerId: session.user.id,
              },
            },
          ],
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.page.count({ where });
    const pages = await prisma.page.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        system: {
          select: { id: true, name: true },
        },
      },
    });

    return listResponse(pages, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return errorResponse('获取页面列表失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = createPageSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const { name, path, systemId } = validationResult.data;
    const canManageSystem = await hasSystemAccess(
      session.user.id,
      systemId,
      PROJECT_MANAGE_ROLES
    );
    if (!canManageSystem) {
      return errors.forbidden();
    }

    const page = await prisma.page.create({
      data: { name, path, systemId },
    });

    return createdResponse(page);
  } catch (error) {
    console.error('Failed to create page:', error);
    return errorResponse('创建页面失败', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = updatePagesSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const { ids, data } = validationResult.data;
    const targetPages = await prisma.page.findMany({
      where: { id: { in: ids } },
      select: { id: true, systemId: true },
    });

    if (targetPages.length !== ids.length) {
      return errors.badRequest('部分页面不存在');
    }

    const systemIds = [...new Set(targetPages.map((page) => page.systemId))];
    for (const systemId of systemIds) {
      const canManageSystem = await hasSystemAccess(
        session.user.id,
        systemId,
        PROJECT_MANAGE_ROLES
      );
      if (!canManageSystem) {
        return errors.forbidden();
      }
    }

    const result = await prisma.page.updateMany({
      where: { id: { in: ids } },
      data: data as Prisma.PageUpdateManyMutationInput,
    });

    return successResponse({ updated: result.count });
  } catch (error) {
    console.error('Failed to update pages:', error);
    return errorResponse('更新页面失败', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return errors.badRequest('缺少页面ID');
    }

    const targetPage = await prisma.page.findUnique({
      where: { id },
      select: { id: true, systemId: true },
    });
    if (!targetPage) {
      return errors.notFound('页面');
    }

    const canManageSystem = await hasSystemAccess(
      session.user.id,
      targetPage.systemId,
      PROJECT_MANAGE_ROLES
    );
    if (!canManageSystem) {
      return errors.forbidden();
    }

    await prisma.page.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Failed to delete page:', error);
    return errorResponse('删除页面失败', 500);
  }
}
