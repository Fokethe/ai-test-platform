import { WorkspaceRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type RoleFilter = {
  role?: {
    in: WorkspaceRole[];
  };
};

function buildRoleFilter(roles?: WorkspaceRole[]): RoleFilter {
  if (!roles || roles.length === 0) {
    return {};
  }

  return { role: { in: roles } };
}

export const MANAGE_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN'];

export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
      ...buildRoleFilter(roles),
    },
    select: { id: true },
  });

  return !!membership;
}

export async function hasProjectAccess(
  userId: string,
  projectId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: {
        members: {
          some: {
            userId,
            ...buildRoleFilter(roles),
          },
        },
      },
    },
    select: { id: true },
  });

  return !!project;
}

export async function hasSystemAccess(
  userId: string,
  systemId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      project: {
        workspace: {
          members: {
            some: {
              userId,
              ...buildRoleFilter(roles),
            },
          },
        },
      },
    },
    select: { id: true },
  });

  return !!system;
}

export async function hasPageAccess(
  userId: string,
  pageId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      system: {
        project: {
          workspace: {
            members: {
              some: {
                userId,
                ...buildRoleFilter(roles),
              },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  return !!page;
}
