import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type EnsurePersonalWorkspaceOptions = {
  db?: DbClient;
  nameHint?: string | null;
  email?: string | null;
};

export function buildPersonalWorkspaceName(
  nameHint?: string | null,
  email?: string | null
): string {
  const fallbackName = email?.split('@')[0]?.trim();
  const displayName = nameHint?.trim() || fallbackName || 'My';
  return `${displayName} Workspace`;
}

export async function ensurePersonalWorkspace(
  userId: string,
  options: EnsurePersonalWorkspaceOptions = {}
) {
  const db = options.db ?? prisma;

  const existing = await db.workspace.findFirst({
    where: {
      ownerId: userId,
      isPersonal: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    await db.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: existing.id,
          userId,
        },
      },
      update: { role: 'OWNER' },
      create: {
        workspaceId: existing.id,
        userId,
        role: 'OWNER',
      },
    });
    return existing;
  }

  const legacyPersonalMember = await db.workspaceMember.findFirst({
    where: {
      userId,
      role: 'OWNER',
      workspace: {
        isPersonal: true,
      },
    },
    select: { workspaceId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (legacyPersonalMember) {
    const adopted = await db.workspace.update({
      where: { id: legacyPersonalMember.workspaceId },
      data: {
        ownerId: userId,
        isPersonal: true,
      },
    });
    return adopted;
  }

  return db.workspace.create({
    data: {
      name: buildPersonalWorkspaceName(options.nameHint, options.email),
      ownerId: userId,
      isPersonal: true,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
  });
}
