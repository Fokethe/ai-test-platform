import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { errorResponse, errors, itemResponse, successResponse } from '@/lib/api-response';
import { MANAGE_ROLES, hasWorkspaceAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

async function getWorkspaceBase(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, isPersonal: true, ownerId: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    const workspaceBase = await getWorkspaceBase(id);
    if (!workspaceBase) {
      return errors.notFound('Workspace');
    }

    const canAccessWorkspace = await hasWorkspaceAccess(session.user.id, id);
    if (!canAccessWorkspace) {
      return errors.forbidden();
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            updatedAt: true,
            _count: {
              select: { systems: true },
            },
          },
        },
        members: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            userId: true,
          },
        },
      },
    });

    if (!workspace) {
      return errors.notFound('Workspace');
    }

    return itemResponse(workspace);
  } catch (error) {
    console.error('Failed to fetch workspace:', error);
    return errorResponse('Failed to fetch workspace', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = updateWorkspaceSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`Input validation failed: ${errorMessages}`);
    }

    const workspaceBase = await getWorkspaceBase(id);
    if (!workspaceBase) {
      return errors.notFound('Workspace');
    }

    const canManageWorkspace = await hasWorkspaceAccess(
      session.user.id,
      id,
      MANAGE_ROLES
    );
    if (!canManageWorkspace) {
      return errors.forbidden();
    }

    if (
      workspaceBase.isPersonal &&
      workspaceBase.ownerId &&
      workspaceBase.ownerId !== session.user.id
    ) {
      return errors.forbidden();
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: validationResult.data,
    });

    return itemResponse(workspace);
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return errorResponse('Failed to update workspace', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;
    const workspaceBase = await getWorkspaceBase(id);
    if (!workspaceBase) {
      return errors.notFound('Workspace');
    }

    const canDeleteWorkspace = await hasWorkspaceAccess(session.user.id, id, ['OWNER']);
    if (!canDeleteWorkspace) {
      return errors.forbidden();
    }

    if (workspaceBase.isPersonal) {
      return errors.badRequest('Personal workspace cannot be deleted');
    }

    const projectCount = await prisma.project.count({
      where: { workspaceId: id },
    });
    if (projectCount > 0) {
      return errors.badRequest('Workspace still has projects and cannot be deleted');
    }

    await prisma.workspace.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return errorResponse('Failed to delete workspace', 500);
  }
}
