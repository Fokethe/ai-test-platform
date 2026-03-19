import { NextRequest } from 'next/server';
import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, errors, successResponse } from '@/lib/api-response';
import { hasWorkspaceAccess, MANAGE_ROLES } from '@/lib/project-access';

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(WorkspaceRole).optional(),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
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

    const project = await getProjectWorkspace(id);
    if (!project) {
      return errors.notFound('项目');
    }

    const canAccessProject = await hasWorkspaceAccess(session.user.id, project.workspaceId);
    if (!canAccessProject) {
      return errors.forbidden();
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: project.workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(members);
  } catch (error) {
    console.error('Get project members error:', error);
    return errorResponse('获取项目成员失败', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const project = await getProjectWorkspace(id);
    if (!project) {
      return errors.notFound('项目');
    }

    const canManageProject = await hasWorkspaceAccess(
      session.user.id,
      project.workspaceId,
      MANAGE_ROLES
    );
    if (!canManageProject) {
      return errors.forbidden();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = addMemberSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const { userId, role } = validationResult.data;
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: project.workspaceId,
        userId,
        role: role ?? WorkspaceRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, status: true },
        },
      },
    });

    return createdResponse(member);
  } catch (error) {
    console.error('Add project member error:', error);
    return errorResponse('添加项目成员失败', 500);
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

    const project = await getProjectWorkspace(id);
    if (!project) {
      return errors.notFound('项目');
    }

    const canManageProject = await hasWorkspaceAccess(
      session.user.id,
      project.workspaceId,
      MANAGE_ROLES
    );
    if (!canManageProject) {
      return errors.forbidden();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = removeMemberSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: validationResult.data.userId,
      },
      select: { id: true },
    });
    if (!targetMember) {
      return errors.notFound('成员');
    }

    await prisma.workspaceMember.delete({
      where: { id: targetMember.id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Remove project member error:', error);
    return errorResponse('移除项目成员失败', 500);
  }
}
