import { ProjectMemberRole, WorkspaceRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type WorkspaceRoleFilter = {
  role?: {
    in: WorkspaceRole[];
  };
};

type ProjectRoleFilter = {
  role?: {
    in: ProjectMemberRole[];
  };
};

function buildWorkspaceRoleFilter(roles?: WorkspaceRole[]): WorkspaceRoleFilter {
  if (!roles || roles.length === 0) {
    return {};
  }

  return { role: { in: roles } };
}

export const MANAGE_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN'];
export const PROJECT_MANAGE_ROLES: ProjectMemberRole[] = ['OWNER', 'ADMIN'];

function buildProjectRoleFilter(roles?: ProjectMemberRole[]): ProjectRoleFilter {
  if (!roles || roles.length === 0) {
    return {};
  }

  return { role: { in: roles } };
}

export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
      ...buildWorkspaceRoleFilter(roles),
    },
    select: { id: true },
  });

  if (membership) {
    return true;
  }

  const ownedWorkspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    select: { id: true },
  });

  return !!ownedWorkspace;
}

export async function hasProjectAccess(
  userId: string,
  projectId: string,
  roles?: ProjectMemberRole[]
): Promise<boolean> {
  const workspaceRoleFilter = roles?.length
    ? buildWorkspaceRoleFilter(roles.map((role) => role as WorkspaceRole))
    : {};

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          members: {
            some: {
              userId,
              ...buildProjectRoleFilter(roles),
            },
          },
        },
        {
          workspace: {
            members: {
              some: {
                userId,
                ...workspaceRoleFilter,
              },
            },
          },
        },
        {
          workspace: {
            ownerId: userId,
          },
        },
      ],
    },
    select: { id: true },
  });

  return !!project;
}

export async function hasSystemAccess(
  userId: string,
  systemId: string,
  roles?: ProjectMemberRole[]
): Promise<boolean> {
  const workspaceRoleFilter = roles?.length
    ? buildWorkspaceRoleFilter(roles.map((role) => role as WorkspaceRole))
    : {};

  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      project: {
        OR: [
          {
            members: {
              some: {
                userId,
                ...buildProjectRoleFilter(roles),
              },
            },
          },
          {
            workspace: {
              members: {
                some: {
                  userId,
                  ...workspaceRoleFilter,
                },
              },
            },
          },
          {
            workspace: {
              ownerId: userId,
            },
          },
        ],
      },
    },
    select: { id: true },
  });

  return !!system;
}

export async function hasPageAccess(
  userId: string,
  pageId: string,
  roles?: ProjectMemberRole[]
): Promise<boolean> {
  const workspaceRoleFilter = roles?.length
    ? buildWorkspaceRoleFilter(roles.map((role) => role as WorkspaceRole))
    : {};

  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      system: {
        project: {
          OR: [
            {
              members: {
                some: {
                  userId,
                  ...buildProjectRoleFilter(roles),
                },
              },
            },
            {
              workspace: {
                members: {
                  some: {
                    userId,
                    ...workspaceRoleFilter,
                  },
                },
              },
            },
            {
              workspace: {
                ownerId: userId,
              },
            },
          ],
        },
      },
    },
    select: { id: true },
  });

  return !!page;
}
