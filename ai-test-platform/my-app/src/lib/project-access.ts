import type { WorkspaceRole } from '@prisma/client';
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
export const PROJECT_MANAGE_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN'];

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
  if (membership) {
    return true;
  }

  const allowOwner = !roles || roles.includes('OWNER');
  if (!allowOwner) {
    return false;
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      ownerId: userId,
    },
    select: { id: true },
  });

  return !!workspace;
}

export async function hasProjectAccess(
  userId: string,
  projectId: string,
  roles?: WorkspaceRole[]
): Promise<boolean> {
  const workspaceRoleFilter = buildRoleFilter(roles);
  const allowOwner = !roles || roles.includes('OWNER');

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: {
        OR: [
          ...(allowOwner
            ? [
                {
                  ownerId: userId,
                },
              ]
            : []),
          {
            members: {
              some: {
                userId,
                ...workspaceRoleFilter,
              },
            },
          },
        ],
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
  const workspaceRoleFilter = buildRoleFilter(roles);
  const allowOwner = !roles || roles.includes('OWNER');

  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      project: {
        workspace: {
          OR: [
            ...(allowOwner
              ? [
                  {
                    ownerId: userId,
                  },
                ]
              : []),
            {
              members: {
                some: {
                  userId,
                  ...workspaceRoleFilter,
                },
              },
            },
          ],
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
  const workspaceRoleFilter = buildRoleFilter(roles);
  const allowOwner = !roles || roles.includes('OWNER');

  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      system: {
        project: {
          workspace: {
            OR: [
              ...(allowOwner
                ? [
                    {
                      ownerId: userId,
                    },
                  ]
                : []),
              {
                members: {
                  some: {
                    userId,
                    ...workspaceRoleFilter,
                  },
                },
              },
            ],
          },
        },
      },
    },
    select: { id: true },
  });

  return !!page;
}
