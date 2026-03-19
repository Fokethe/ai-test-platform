import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createdResponse, errors } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

async function ensureAccess(userId: string, projectId?: string | null) {
  if (!projectId) {
    return true;
  }
  return hasProjectAccess(userId, projectId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const sourceRun = await prisma.run.findUnique({
    where: { id },
    include: {
      executions: {
        select: {
          testId: true,
        },
      },
    },
  });

  if (!sourceRun) {
    return errors.notFound('Run');
  }

  const canAccess = await ensureAccess(session.user.id, sourceRun.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const now = new Date();
  const testIds = Array.from(new Set(sourceRun.executions.map((execution) => execution.testId)));
  const rerun = await prisma.$transaction(async (tx) => {
    const created = await tx.run.create({
      data: {
        name: `${sourceRun.name} (Rerun)`,
        description: sourceRun.description,
        type: sourceRun.type,
        status: 'RUNNING',
        cron: sourceRun.cron,
        scheduleId: sourceRun.scheduleId,
        projectId: sourceRun.projectId,
        createdBy: session.user.id,
        totalCount: testIds.length,
        startedAt: now,
      },
    });

    if (testIds.length > 0) {
      await tx.execution.createMany({
        data: testIds.map((testId) => ({
          runId: created.id,
          testId,
          status: 'PENDING',
        })),
      });
    }

    return created;
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RUN_RERUN_TRIGGERED',
    target: 'RUN',
    targetId: rerun.id,
    projectId: rerun.projectId || undefined,
    metadata: {
      sourceRunId: sourceRun.id,
      totalCount: rerun.totalCount,
    },
  });

  return createdResponse(rerun);
}
