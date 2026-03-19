import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errors, successResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const idListSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const batchUpdateSchema = idListSchema.extend({
  status: z.enum(['ACTIVE', 'DRAFT', 'DEPRECATED', 'ARCHIVED']),
  source: z.string().optional(),
  aiPrompt: z.string().optional(),
  aiModel: z.string().optional(),
});

const batchMoveSchema = idListSchema.extend({
  parentId: z.string().optional(),
  folderId: z.string().optional(),
  suiteId: z.string().optional(),
});

type BatchResultItem = {
  id: string;
  success: boolean;
  action: 'delete' | 'update' | 'move';
  reason?: string;
};

function getAccessScope(userId: string) {
  return {
    project: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
  } as const;
}

async function getAuthorizedTests(userId: string, ids: string[]) {
  return prisma.test.findMany({
    where: {
      id: { in: ids },
      AND: [getAccessScope(userId)],
    },
    select: {
      id: true,
      projectId: true,
    },
  });
}

function buildSummary(requestedIds: string[], results: BatchResultItem[]) {
  return {
    requested: requestedIds.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
  };
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const validation = idListSchema.safeParse(body);
  if (!validation.success) {
    return errors.badRequest(validation.error.issues[0]?.message || 'Invalid payload');
  }

  const ids = Array.from(new Set(validation.data.ids));
  const authorizedTests = await getAuthorizedTests(session.user.id, ids);
  if (authorizedTests.length === 0) {
    return errors.forbidden();
  }

  const authorizedIds = new Set(authorizedTests.map((item) => item.id));
  const results: BatchResultItem[] = [];

  for (const id of ids) {
    if (!authorizedIds.has(id)) {
      results.push({
        id,
        success: false,
        action: 'delete',
        reason: 'FORBIDDEN',
      });
      continue;
    }

    try {
      await prisma.test.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      results.push({
        id,
        success: true,
        action: 'delete',
      });
    } catch (error) {
      results.push({
        id,
        success: false,
        action: 'delete',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  return successResponse({
    summary: buildSummary(ids, results),
    results,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const validation = batchUpdateSchema.safeParse(body);
  if (!validation.success) {
    return errors.badRequest(validation.error.issues[0]?.message || 'Invalid payload');
  }

  const ids = Array.from(new Set(validation.data.ids));
  const authorizedTests = await getAuthorizedTests(session.user.id, ids);
  if (authorizedTests.length === 0) {
    return errors.forbidden();
  }

  const authorizedIds = new Set(authorizedTests.map((item) => item.id));
  const results: BatchResultItem[] = [];

  for (const id of ids) {
    if (!authorizedIds.has(id)) {
      results.push({
        id,
        success: false,
        action: 'update',
        reason: 'FORBIDDEN',
      });
      continue;
    }

    try {
      await prisma.test.update({
        where: { id },
        data: {
          status: validation.data.status,
          source: validation.data.source,
          aiPrompt: validation.data.aiPrompt,
          aiModel: validation.data.aiModel,
        },
      });
      results.push({
        id,
        success: true,
        action: 'update',
      });
    } catch (error) {
      results.push({
        id,
        success: false,
        action: 'update',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  return successResponse({
    summary: buildSummary(ids, results),
    results,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const validation = batchMoveSchema.safeParse(body);
  if (!validation.success) {
    return errors.badRequest(validation.error.issues[0]?.message || 'Invalid payload');
  }

  const ids = Array.from(new Set(validation.data.ids));
  const targetParentId =
    validation.data.parentId || validation.data.folderId || validation.data.suiteId || null;

  const authorizedTests = await getAuthorizedTests(session.user.id, ids);
  if (authorizedTests.length === 0) {
    return errors.forbidden();
  }

  const authorizedIds = new Set(authorizedTests.map((item) => item.id));
  const projectByTestId = new Map(authorizedTests.map((item) => [item.id, item.projectId]));
  const results: BatchResultItem[] = [];

  let targetParent:
    | {
        id: string;
        projectId: string;
      }
    | null = null;

  if (targetParentId) {
    targetParent = await prisma.test.findFirst({
      where: {
        id: targetParentId,
        AND: [getAccessScope(session.user.id)],
      },
      select: { id: true, projectId: true },
    });

    if (!targetParent) {
      return errors.badRequest('target parent is invalid or inaccessible');
    }
  }

  for (const id of ids) {
    if (!authorizedIds.has(id)) {
      results.push({
        id,
        success: false,
        action: 'move',
        reason: 'FORBIDDEN',
      });
      continue;
    }

    if (
      targetParent &&
      projectByTestId.get(id) &&
      projectByTestId.get(id) !== targetParent.projectId
    ) {
      results.push({
        id,
        success: false,
        action: 'move',
        reason: 'PROJECT_MISMATCH',
      });
      continue;
    }

    try {
      await prisma.test.update({
        where: { id },
        data: {
          parentId: targetParent ? targetParent.id : null,
        },
      });
      results.push({
        id,
        success: true,
        action: 'move',
      });
    } catch (error) {
      results.push({
        id,
        success: false,
        action: 'move',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  return successResponse({
    summary: buildSummary(ids, results),
    targetParentId: targetParent ? targetParent.id : null,
    results,
  });
}
