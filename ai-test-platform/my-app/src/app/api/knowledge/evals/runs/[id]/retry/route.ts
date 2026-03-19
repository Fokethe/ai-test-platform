import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { retryEvalRun } from '@/lib/ai/rag/eval-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const run = await prisma.ragEvalRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      projectId: true,
      strategyVersion: true,
      datasetVersionId: true,
    },
  });

  if (!run) {
    return errors.notFound('Eval run');
  }

  if (run.projectId) {
    const canAccess = await hasProjectAccess(session.user.id, run.projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  if (run.status !== 'FAILED') {
    return errors.badRequest('Only FAILED runs can be retried');
  }

  const result = await retryEvalRun({
    actorId: session.user.id,
    runId: id,
  });

  if (!result) {
    return errors.notFound('Eval run');
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_EVAL_RUN_RETRIED',
    target: 'RAG_EVAL_RUN',
    targetId: result.run.id,
    projectId: run.projectId || undefined,
    metadata: {
      recoveredFromRunId: id,
      strategyVersion: run.strategyVersion,
      datasetVersionId: run.datasetVersionId,
      stability: result.stability,
    },
  });

  return successResponse({
    recoveredFromRunId: id,
    run: {
      id: result.run.id,
      status: result.run.status,
      strategyVersion: result.run.strategyVersion,
      resultVersion: result.run.resultVersion,
      retryCount: result.run.retryCount,
      totalCost: result.run.totalCost,
      reproducibilityKey: result.run.reproducibilityKey,
      createdAt: result.run.createdAt,
      finishedAt: result.run.finishedAt,
      metrics: result.run.parsedMetrics || null,
    },
    nfr12: result.stability,
  });
}
