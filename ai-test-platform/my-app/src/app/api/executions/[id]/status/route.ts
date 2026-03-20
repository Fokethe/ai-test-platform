import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NewExecutionStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { deliverIntegrationEvent } from '@/lib/integrations/event-delivery';
import { notifyProjectMembers } from '@/lib/notifications/project-events';

const statusSchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'ERROR']),
  idempotencyKey: z.string().min(1).max(120).optional(),
  note: z.string().max(500).optional(),
  errorMessage: z.string().max(2000).nullable().optional(),
  errorStack: z.string().max(10000).nullable().optional(),
  screenshot: z.string().max(1000).nullable().optional(),
  video: z.string().max(1000).nullable().optional(),
  stdout: z.string().max(10000).nullable().optional(),
  stderr: z.string().max(10000).nullable().optional(),
});

const terminalStatuses: NewExecutionStatus[] = ['PASSED', 'FAILED', 'SKIPPED', 'ERROR'];
const terminalRunStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

function isTerminalRunStatus(status: string | null | undefined) {
  return !!status && terminalRunStatuses.has(status);
}

function toRunCounts(statuses: NewExecutionStatus[]) {
  const totalCount = statuses.length;
  const passedCount = statuses.filter((status) => status === 'PASSED').length;
  const failedCount = statuses.filter(
    (status) => status === 'FAILED' || status === 'ERROR'
  ).length;
  const skippedCount = statuses.filter((status) => status === 'SKIPPED').length;
  const runningCount = statuses.filter((status) => status === 'RUNNING').length;
  const pendingCount = statuses.filter((status) => status === 'PENDING').length;

  let runStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  if (runningCount > 0) {
    runStatus = 'RUNNING';
  } else if (pendingCount === totalCount) {
    runStatus = 'PENDING';
  } else if (pendingCount > 0) {
    runStatus = 'RUNNING';
  } else if (failedCount > 0) {
    runStatus = 'FAILED';
  } else {
    runStatus = 'COMPLETED';
  }

  return {
    totalCount,
    passedCount,
    failedCount,
    skippedCount,
    runningCount,
    pendingCount,
    runStatus,
  };
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
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      test: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
      run: {
        select: {
          id: true,
          name: true,
          projectId: true,
          status: true,
        },
      },
      statusEvents: {
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  });

  if (!execution) {
    return errors.notFound('Execution');
  }

  const projectId = execution.run.projectId || execution.test.projectId;
  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  return successResponse(execution);
}

export async function PATCH(
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

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const { id } = await params;
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      run: {
        select: {
          id: true,
          name: true,
          projectId: true,
          startedAt: true,
          status: true,
        },
      },
      test: {
        select: {
          id: true,
          projectId: true,
        },
      },
    },
  });

  if (!execution) {
    return errors.notFound('Execution');
  }

  const projectId = execution.run.projectId || execution.test.projectId;
  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  if (parsed.data.idempotencyKey) {
    const existingEvent = await prisma.executionStatusEvent.findUnique({
      where: {
        executionId_idempotencyKey: {
          executionId: id,
          idempotencyKey: parsed.data.idempotencyKey,
        },
      },
    });

    if (existingEvent) {
      return successResponse({
        idempotent: true,
        transition: existingEvent,
      });
    }
  }

  const now = new Date();
  const nextStatus = parsed.data.status;
  const previousStatus = execution.status;
  const result = await prisma.$transaction(async (tx) => {
    const updatedExecution = await tx.execution.update({
      where: { id },
      data: {
        status: nextStatus,
        errorMessage: parsed.data.errorMessage,
        errorStack: parsed.data.errorStack,
        screenshot: parsed.data.screenshot,
        video: parsed.data.video,
        stdout: parsed.data.stdout,
        stderr: parsed.data.stderr,
        startedAt:
          nextStatus === 'RUNNING' && !execution.startedAt ? now : execution.startedAt,
        completedAt:
          terminalStatuses.includes(nextStatus) && !execution.completedAt
            ? now
            : execution.completedAt,
      },
    });

    const transition = await tx.executionStatusEvent.create({
      data: {
        executionId: id,
        fromStatus: previousStatus,
        toStatus: nextStatus,
        idempotencyKey: parsed.data.idempotencyKey,
        note: parsed.data.note,
        actorId: session.user.id,
      },
    });

    const runExecutions = await tx.execution.findMany({
      where: {
        runId: execution.run.id,
      },
      select: {
        status: true,
      },
    });

    const counts = toRunCounts(runExecutions.map((item) => item.status));
    const shouldCompleteRun =
      counts.runStatus === 'COMPLETED' || counts.runStatus === 'FAILED';
    const runStartedAt = execution.run.startedAt || (counts.runStatus !== 'PENDING' ? now : null);
    const runCompletedAt = shouldCompleteRun ? now : null;

    const updatedRun = await tx.run.update({
      where: { id: execution.run.id },
      data: {
        status: counts.runStatus,
        totalCount: counts.totalCount,
        passedCount: counts.passedCount,
        failedCount: counts.failedCount,
        skippedCount: counts.skippedCount,
        startedAt: runStartedAt,
        completedAt: runCompletedAt,
        duration:
          runStartedAt && runCompletedAt
            ? Math.max(0, runCompletedAt.getTime() - runStartedAt.getTime())
            : undefined,
      },
      select: {
        id: true,
        status: true,
        totalCount: true,
        passedCount: true,
        failedCount: true,
        skippedCount: true,
        startedAt: true,
        completedAt: true,
        duration: true,
      },
    });

    return {
      execution: updatedExecution,
      transition,
      run: updatedRun,
      counts,
    };
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'EXECUTION_STATUS_UPDATED',
    target: 'EXECUTION',
    targetId: id,
    projectId: projectId || undefined,
    metadata: {
      fromStatus: previousStatus,
      toStatus: nextStatus,
      runId: execution.run.id,
      idempotencyKey: parsed.data.idempotencyKey,
    },
  });

  const runJustCompleted =
    isTerminalRunStatus(result.run.status) &&
    !isTerminalRunStatus(execution.run.status);

  if (projectId && runJustCompleted) {
    try {
      await Promise.all([
        deliverIntegrationEvent({
          projectId,
          event: 'run.completed',
          actorId: session.user.id,
          payload: {
            runId: result.run.id,
            runName: execution.run.name,
            status: result.run.status,
            totalCount: result.run.totalCount,
            passedCount: result.run.passedCount,
            failedCount: result.run.failedCount,
            skippedCount: result.run.skippedCount,
            completedAt: result.run.completedAt,
          },
        }),
        notifyProjectMembers({
          projectId,
          actorId: session.user.id,
          category: 'execution',
          type: 'EXECUTION',
          title: result.run.status === 'FAILED' ? 'Run 执行失败' : 'Run 执行完成',
          content: `运行 ${execution.run.name || result.run.id} 已结束，状态：${result.run.status}`,
          data: {
            runId: result.run.id,
            runStatus: result.run.status,
            failedCount: result.run.failedCount,
            totalCount: result.run.totalCount,
          },
        }),
      ]);
    } catch (dispatchError) {
      console.error('Failed to dispatch run completion signals:', dispatchError);
    }
  }

  return successResponse(result);
}
