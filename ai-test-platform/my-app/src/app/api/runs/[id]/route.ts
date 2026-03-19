import { NextRequest } from 'next/server';
import { z } from 'zod';
import { NewExecutionStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
});

function toRunStats(executions: Array<{ status: NewExecutionStatus }>) {
  const total = executions.length;
  const passed = executions.filter((item) => item.status === 'PASSED').length;
  const failed = executions.filter(
    (item) => item.status === 'FAILED' || item.status === 'ERROR'
  ).length;
  const skipped = executions.filter((item) => item.status === 'SKIPPED').length;
  const running = executions.filter((item) => item.status === 'RUNNING').length;
  const pending = executions.filter((item) => item.status === 'PENDING').length;
  return {
    total,
    passed,
    failed,
    skipped,
    running,
    pending,
  };
}

async function ensureAccess(userId: string, projectId?: string | null) {
  if (!projectId) {
    return true;
  }
  return hasProjectAccess(userId, projectId);
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
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      executions: {
        orderBy: [{ createdAt: 'asc' }],
        include: {
          test: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          statusEvents: {
            orderBy: [{ createdAt: 'asc' }],
          },
        },
      },
      issues: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          executionId: true,
        },
      },
    },
  });

  if (!run) {
    return errors.notFound('Run');
  }

  const canAccess = await ensureAccess(session.user.id, run.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const stats = toRunStats(run.executions);
  return successResponse({
    ...run,
    stats,
    passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const existing = await prisma.run.findUnique({
    where: { id },
    include: {
      executions: {
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      },
    },
  });
  if (!existing) {
    return errors.notFound('Run');
  }

  const canAccess = await ensureAccess(session.user.id, existing.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const now = new Date();
  const nextStatus = parsed.data.status;

  const updated = await prisma.$transaction(async (tx) => {
    if (nextStatus === 'CANCELLED') {
      const cancellableExecutions = existing.executions.filter(
        (execution) =>
          execution.status === 'PENDING' || execution.status === 'RUNNING'
      );
      if (cancellableExecutions.length > 0) {
        await tx.execution.updateMany({
          where: {
            id: {
              in: cancellableExecutions.map((execution) => execution.id),
            },
          },
          data: {
            status: 'SKIPPED',
            completedAt: now,
          },
        });

        await tx.executionStatusEvent.createMany({
          data: cancellableExecutions.map((execution) => ({
            executionId: execution.id,
            fromStatus: execution.status,
            toStatus: 'SKIPPED',
            actorId: session.user.id,
            note: 'run_cancelled',
          })),
        });
      }
    }

    const run = await tx.run.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: nextStatus,
        startedAt:
          nextStatus === 'RUNNING' && !existing.startedAt ? now : existing.startedAt,
        completedAt:
          nextStatus === 'COMPLETED' ||
          nextStatus === 'FAILED' ||
          nextStatus === 'CANCELLED'
            ? now
            : existing.completedAt,
      },
    });

    return run;
  });

  if (updated.startedAt && updated.completedAt) {
    await prisma.run.update({
      where: { id: updated.id },
      data: {
        duration: Math.max(0, updated.completedAt.getTime() - updated.startedAt.getTime()),
      },
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RUN_UPDATED',
    target: 'RUN',
    targetId: updated.id,
    projectId: updated.projectId || undefined,
    metadata: {
      status: updated.status,
      name: updated.name,
    },
  });

  return successResponse(updated, 'Run updated');
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
  const existing = await prisma.run.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!existing) {
    return errors.notFound('Run');
  }

  const canAccess = await ensureAccess(session.user.id, existing.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  await prisma.run.delete({
    where: { id },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RUN_DELETED',
    target: 'RUN',
    targetId: id,
    projectId: existing.projectId || undefined,
  });

  return successResponse(null, 'Run deleted');
}
