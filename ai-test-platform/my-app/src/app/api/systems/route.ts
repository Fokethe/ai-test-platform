import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
} from '@/lib/api-response';
import { hasProjectAccess, PROJECT_MANAGE_ROLES } from '@/lib/project-access';

const createSystemSchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z.string().min(1).max(500),
  projectId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const where: Prisma.SystemWhereInput = {};
    if (projectId) {
      const canAccessProject = await hasProjectAccess(session.user.id, projectId);
      if (!canAccessProject) {
        return errors.forbidden();
      }
      where.projectId = projectId;
    } else {
      where.project = {
        OR: [
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
          {
            workspace: {
              members: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          },
          {
            workspace: {
              ownerId: session.user.id,
            },
          },
        ],
      };
    }

    const total = await prisma.system.count({ where });
    const systems = await prisma.system.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { pages: true },
        },
      },
    });

    const formattedSystems = systems.map((system) => ({
      ...system,
      pageCount: system._count.pages,
      _count: undefined,
    }));

    return listResponse(formattedSystems, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch systems:', error);
    return errorResponse('获取系统列表失败', 500);
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

    const validationResult = createSystemSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const { name, baseUrl, projectId } = validationResult.data;
    const canManageProject = await hasProjectAccess(
      session.user.id,
      projectId,
      PROJECT_MANAGE_ROLES
    );
    if (!canManageProject) {
      return errors.forbidden();
    }

    const system = await prisma.system.create({
      data: { name, baseUrl, projectId },
    });

    return createdResponse(system);
  } catch (error) {
    console.error('Failed to create system:', error);
    return errorResponse('创建系统失败', 500);
  }
}
