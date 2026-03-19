import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { errors, errorResponse, successResponse } from '@/lib/api-response';
import { hasWorkspaceAccess, MANAGE_ROLES } from '@/lib/project-access';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

async function getProjectWorkspace(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
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

    const projectBase = await getProjectWorkspace(id);
    if (!projectBase) {
      return errors.notFound('项目');
    }

    const canAccessProject = await hasWorkspaceAccess(session.user.id, projectBase.workspaceId);
    if (!canAccessProject) {
      return errors.forbidden();
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { members: true },
            },
          },
        },
        tests: {
          select: { id: true, name: true, type: true, status: true },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
        runs: {
          select: { id: true, name: true, status: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        issues: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true, title: true, severity: true, status: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { tests: true, runs: true, issues: true, systems: true },
        },
      },
    });

    if (!project) {
      return errors.notFound('项目');
    }

    return successResponse({
      ...project,
      testCount: project._count.tests,
      runCount: project._count.runs,
      issueCount: project._count.issues,
      systemCount: project._count.systems,
      memberCount: project.workspace._count.members,
      _count: undefined,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return errorResponse('获取项目详情失败', 500);
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

    const validationResult = updateProjectSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const existing = await getProjectWorkspace(id);
    if (!existing) {
      return errors.notFound('项目');
    }

    const canManageProject = await hasWorkspaceAccess(
      session.user.id,
      existing.workspaceId,
      MANAGE_ROLES
    );
    if (!canManageProject) {
      return errors.forbidden();
    }

    const { name, description, status } = validationResult.data;
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update project error:', error);
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

    const existing = await getProjectWorkspace(id);
    if (!existing) {
      return errors.notFound('项目');
    }

    const canManageProject = await hasWorkspaceAccess(
      session.user.id,
      existing.workspaceId,
      MANAGE_ROLES
    );
    if (!canManageProject) {
      return errors.forbidden();
    }

    await prisma.project.delete({ where: { id } });
    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete project error:', error);
    return errorResponse('删除失败', 500);
  }
}
