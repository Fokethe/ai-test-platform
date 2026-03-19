import { NextRequest } from 'next/server';
import { ProjectAccessType, ProjectMemberRole } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';
import { createdResponse, errorResponse, errors, successResponse } from '@/lib/api-response';
import { PROJECT_MANAGE_ROLES, hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectMemberRole).optional(),
  accessType: z.nativeEnum(ProjectAccessType).optional(),
});

const updateMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectMemberRole).optional(),
  accessType: z.nativeEnum(ProjectAccessType).optional(),
  transferOwnership: z.boolean().optional(),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

async function getProject(projectId: string) {
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

    const project = await getProject(id);
    if (!project) {
      return errors.notFound('Project');
    }

    const canAccessProject = await hasProjectAccess(session.user.id, id);
    if (!canAccessProject) {
      return errors.forbidden();
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, status: true },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return successResponse(members);
  } catch (error) {
    console.error('Get project members error:', error);
    return errorResponse('Failed to fetch project members', 500);
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

    const project = await getProject(id);
    if (!project) {
      return errors.notFound('Project');
    }

    const canManageProject = await hasProjectAccess(session.user.id, id, PROJECT_MANAGE_ROLES);
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
      return errors.badRequest(`Input validation failed: ${errorMessages}`);
    }

    const { userId, role, accessType } = validationResult.data;
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!targetUser) {
      return errors.notFound('User');
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
      update: {
        role: role ?? ProjectMemberRole.MEMBER,
        accessType: accessType ?? ProjectAccessType.SHARED,
        grantedBy: session.user.id,
      },
      create: {
        projectId: id,
        userId,
        role: role ?? ProjectMemberRole.MEMBER,
        accessType: accessType ?? ProjectAccessType.SHARED,
        grantedBy: session.user.id,
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
    return errorResponse('Failed to add project member', 500);
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

    const project = await getProject(id);
    if (!project) {
      return errors.notFound('Project');
    }

    const canManageProject = await hasProjectAccess(session.user.id, id, PROJECT_MANAGE_ROLES);
    if (!canManageProject) {
      return errors.forbidden();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = updateMemberSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`Input validation failed: ${errorMessages}`);
    }

    const { userId, role, accessType, transferOwnership } = validationResult.data;
    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
      select: { id: true },
    });
    if (!targetMember) {
      return errors.notFound('Project member');
    }

    if (transferOwnership) {
      await prisma.$transaction([
        prisma.projectMember.updateMany({
          where: {
            projectId: id,
            role: ProjectMemberRole.OWNER,
          },
          data: {
            role: ProjectMemberRole.ADMIN,
            accessType: ProjectAccessType.TRANSFERRED,
            grantedBy: session.user.id,
          },
        }),
        prisma.projectMember.update({
          where: {
            projectId_userId: {
              projectId: id,
              userId,
            },
          },
          data: {
            role: ProjectMemberRole.OWNER,
            accessType: ProjectAccessType.OWNED,
            grantedBy: session.user.id,
          },
        }),
      ]);

      return successResponse({ transferred: true }, 'Ownership transferred');
    }

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
      data: {
        role: role ?? undefined,
        accessType: accessType ?? undefined,
        grantedBy: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, status: true },
        },
      },
    });

    return successResponse(updated, 'Project member updated');
  } catch (error) {
    console.error('Update project member error:', error);
    return errorResponse('Failed to update project member', 500);
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

    const project = await getProject(id);
    if (!project) {
      return errors.notFound('Project');
    }

    const canManageProject = await hasProjectAccess(session.user.id, id, PROJECT_MANAGE_ROLES);
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
      return errors.badRequest(`Input validation failed: ${errorMessages}`);
    }

    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: validationResult.data.userId,
        },
      },
      select: { id: true, role: true },
    });
    if (!targetMember) {
      return errors.notFound('Project member');
    }

    if (targetMember.role === ProjectMemberRole.OWNER) {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId: id,
          role: ProjectMemberRole.OWNER,
        },
      });
      if (ownerCount <= 1) {
        return errors.badRequest('Cannot remove the last project owner');
      }
    }

    await prisma.projectMember.delete({
      where: { id: targetMember.id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Remove project member error:', error);
    return errorResponse('Failed to remove project member', 500);
  }
}
