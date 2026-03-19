import { NextRequest } from 'next/server';
import { z } from 'zod';
import { IssueStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

const transitionSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  note: z.string().max(1000).optional(),
  resolution: z.string().max(200).optional(),
  assigneeId: z.string().nullable().optional(),
  regressionRunId: z.string().optional(),
  regressionExecutionId: z.string().optional(),
  regressionResult: z.enum(['PASSED', 'FAILED', 'SKIPPED']).optional(),
});

async function ensureIssueAccess(userId: string, issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      projectId: true,
      status: true,
      runId: true,
      testId: true,
      executionId: true,
      resolvedAt: true,
    },
  });

  if (!issue) {
    return { issue: null, allowed: false };
  }
  const allowed = await hasProjectAccess(userId, issue.projectId);
  return { issue, allowed };
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
  const access = await ensureIssueAccess(session.user.id, id);
  if (!access.issue) {
    return errors.notFound('Issue');
  }
  if (!access.allowed) {
    return errors.forbidden();
  }

  const [issue, events] = await Promise.all([
    prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.issueLifecycleEvent.findMany({
      where: { issueId: id },
      orderBy: [{ createdAt: 'asc' }],
      include: {
        run: {
          select: { id: true, name: true, status: true },
        },
        execution: {
          select: { id: true, status: true, testId: true },
        },
      },
    }),
  ]);

  return successResponse({
    issue,
    lifecycle: events,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const { id } = await params;
  const access = await ensureIssueAccess(session.user.id, id);
  if (!access.issue) {
    return errors.notFound('Issue');
  }
  if (!access.allowed) {
    return errors.forbidden();
  }

  if (parsed.data.regressionExecutionId) {
    const execution = await prisma.execution.findUnique({
      where: { id: parsed.data.regressionExecutionId },
      select: {
        id: true,
        runId: true,
      },
    });
    if (!execution) {
      return errors.badRequest('regressionExecutionId does not exist');
    }
  }

  if (parsed.data.regressionRunId) {
    const run = await prisma.run.findUnique({
      where: { id: parsed.data.regressionRunId },
      select: { id: true },
    });
    if (!run) {
      return errors.badRequest('regressionRunId does not exist');
    }
  }

  const now = new Date();
  const nextStatus = parsed.data.status as IssueStatus;
  const previousStatus = access.issue.status;
  const result = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.update({
      where: { id },
      data: {
        status: nextStatus,
        assigneeId: parsed.data.assigneeId,
        resolution: parsed.data.resolution,
        resolvedAt:
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? now
            : access.issue?.resolvedAt || null,
      },
    });

    const lifecycle = await tx.issueLifecycleEvent.create({
      data: {
        issueId: id,
        fromStatus: previousStatus,
        toStatus: nextStatus,
        actorId: session.user.id,
        note: parsed.data.note,
        regressionRunId: parsed.data.regressionRunId || undefined,
        regressionExecutionId: parsed.data.regressionExecutionId || undefined,
        regressionResult: parsed.data.regressionResult || undefined,
      },
    });

    return { issue, lifecycle };
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'ISSUE_LIFECYCLE_UPDATED',
    target: 'ISSUE',
    targetId: id,
    projectId: access.issue.projectId,
    metadata: {
      fromStatus: previousStatus,
      toStatus: nextStatus,
      regressionRunId: parsed.data.regressionRunId,
      regressionExecutionId: parsed.data.regressionExecutionId,
      regressionResult: parsed.data.regressionResult,
    },
  });

  return successResponse(result, 'Issue lifecycle updated');
}
