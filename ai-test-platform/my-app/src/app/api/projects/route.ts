import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { listResponse, createdResponse, errorResponse, errors, buildMeta } from '@/lib/api-response';
import { hasWorkspaceAccess, MANAGE_ROLES } from '@/lib/project-access';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  workspaceId: z.string().min(1),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const where: Prisma.ProjectWhereInput = {
      OR: [
        { members: { some: { userId: session.user.id } } },
        { workspace: { members: { some: { userId: session.user.id } } } },
        { workspace: { ownerId: session.user.id } },
      ],
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    if (status) {
      where.status = status as Prisma.ProjectStatus;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { systems: true, tests: true, runs: true, issues: true, members: true },
        },
      },
    });

    const formattedProjects = projects.map((project) => ({
      ...project,
      systemCount: project._count.systems,
      testCount: project._count.tests,
      runCount: project._count.runs,
      issueCount: project._count.issues,
      memberCount: project._count.members,
      _count: undefined,
    }));

    return listResponse(formattedProjects, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return errorResponse('获取项目列表失败', 500);
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

    const validationResult = createProjectSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const { name, description, workspaceId } = validationResult.data;
    const canManageWorkspace = await hasWorkspaceAccess(
      session.user.id,
      workspaceId,
      MANAGE_ROLES
    );
    if (!canManageWorkspace) {
      return errors.forbidden();
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        status: validationResult.data.status ?? 'ACTIVE',
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
            accessType: 'OWNED',
            grantedBy: session.user.id,
          },
        },
      },
    });

    return createdResponse(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    return errorResponse('创建项目失败', 500);
  }
}
