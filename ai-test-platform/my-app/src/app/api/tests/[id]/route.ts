import { NextRequest } from 'next/server';
import { errors, successResponse } from '@/lib/api-response';
import { parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { resolveLegacyRequirementId } from '@/lib/requirements/legacy-bridge';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

function normalizePriority(priority: unknown): Priority {
  if (typeof priority === 'string' && VALID_PRIORITIES.includes(priority as Priority)) {
    return priority as Priority;
  }
  return 'P1';
}

function safeParseJsonArray(value: string | null): unknown[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function findAccessibleTest(testId: string, userId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, projectId: true },
  });

  if (!test) {
    return { test: null, error: errors.notFound('Test') };
  }

  const canAccessProject = await hasProjectAccess(userId, test.projectId);
  if (!canAccessProject) {
    return { test: null, error: errors.forbidden() };
  }

  return { test, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await findAccessibleTest(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      requirement: { select: { id: true, title: true, pageId: true } },
      parent: { select: { id: true, name: true, type: true } },
      children: {
        select: { id: true, name: true, type: true, status: true, priority: true },
        orderBy: { updatedAt: 'desc' },
      },
      executions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          run: {
            select: { id: true, name: true, status: true, createdAt: true },
          },
        },
      },
      issues: {
        where: { status: { not: 'CLOSED' } },
        select: { id: true, title: true, severity: true, status: true },
      },
    },
  });

  if (!test) {
    return errors.notFound('Test');
  }

  const executionStats = await prisma.execution.groupBy({
    by: ['status'],
    where: { testId: id },
    _count: { status: true },
  });

  const executionCount = executionStats.reduce((sum, item) => sum + item._count.status, 0);
  const passCount = executionStats.find((item) => item.status === 'PASSED')?._count.status ?? 0;
  const failCount = executionStats.find((item) => item.status === 'FAILED')?._count.status ?? 0;

  return successResponse({
    ...test,
    steps: safeParseJsonArray(test.content),
    tags: safeParseJsonArray(test.tags),
    executionCount,
    passCount,
    failCount,
    traceability: {
      requirement: test.requirement
        ? {
            id: test.requirement.id,
            title: test.requirement.title,
            pageId: test.requirement.pageId,
          }
        : null,
      executionIds: test.executions.map((item) => item.id),
      runIds: test.executions.map((item) => item.runId),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await findAccessibleTest(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const parseResult = await parseJsonBody<{
    name?: unknown;
    description?: unknown;
    status?: unknown;
    priority?: unknown;
    tags?: unknown;
    steps?: unknown;
    content?: unknown;
    parentId?: unknown;
    requirementId?: unknown;
    source?: unknown;
    aiPrompt?: unknown;
    aiModel?: unknown;
  }>(request);
  if (!parseResult.success) {
    return parseResult.error;
  }

  const patch: {
    name?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    parentId?: string | null;
    requirementId?: string;
    tags?: string | null;
    content?: string | null;
    source?: string;
    aiPrompt?: string | null;
    aiModel?: string | null;
  } = {};

  if (typeof parseResult.data.name === 'string') {
    const value = parseResult.data.name.trim();
    if (!value) {
      return errors.badRequest('name cannot be empty');
    }
    patch.name = value;
  }
  if (typeof parseResult.data.description === 'string') {
    patch.description = parseResult.data.description.trim();
  } else if (parseResult.data.description === null) {
    patch.description = null;
  }
  if (typeof parseResult.data.status === 'string') {
    patch.status = parseResult.data.status;
  }
  if (parseResult.data.priority !== undefined) {
    patch.priority = normalizePriority(parseResult.data.priority);
  }
  if (parseResult.data.parentId !== undefined) {
    patch.parentId =
      typeof parseResult.data.parentId === 'string'
        ? parseResult.data.parentId.trim() || null
        : null;
  }
  if (typeof parseResult.data.source === 'string') {
    patch.source = parseResult.data.source.trim() || 'MANUAL';
  }
  if (typeof parseResult.data.aiPrompt === 'string') {
    patch.aiPrompt = parseResult.data.aiPrompt;
  }
  if (typeof parseResult.data.aiModel === 'string') {
    patch.aiModel = parseResult.data.aiModel;
  }

  if (parseResult.data.tags !== undefined) {
    if (Array.isArray(parseResult.data.tags)) {
      patch.tags = JSON.stringify(
        parseResult.data.tags.filter((item): item is string => typeof item === 'string')
      );
    } else if (typeof parseResult.data.tags === 'string') {
      patch.tags = parseResult.data.tags;
    } else {
      patch.tags = null;
    }
  }

  if (parseResult.data.steps !== undefined) {
    patch.content = JSON.stringify(parseResult.data.steps);
  } else if (parseResult.data.content !== undefined) {
    patch.content =
      parseResult.data.content === null
        ? null
        : typeof parseResult.data.content === 'string'
        ? parseResult.data.content
        : JSON.stringify(parseResult.data.content);
  }

  if (typeof parseResult.data.requirementId === 'string') {
    const requirementId = parseResult.data.requirementId.trim();
    const resolved = await resolveLegacyRequirementId({
      projectId: access.test!.projectId,
      requirementId,
    });
    if (!resolved) {
      return errors.badRequest('requirementId is invalid for this project');
    }
    patch.requirementId = resolved;
  }

  if (patch.parentId) {
    const parent = await prisma.test.findFirst({
      where: { id: patch.parentId, projectId: access.test!.projectId },
      select: { id: true },
    });
    if (!parent) {
      return errors.badRequest('parentId is invalid for this project');
    }
  }

  const updated = await prisma.test.update({
    where: { id },
    data: patch,
  });

  return successResponse(updated, 'Test updated');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await findAccessibleTest(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  await prisma.test.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  return successResponse(null, 'Test archived');
}
