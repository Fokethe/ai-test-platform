import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  listEvalRuns,
  runEvalOrchestration,
  EvalFramework,
} from '@/lib/ai/rag/eval-service';

const frameworkSchema = z.enum(['ragas', 'grouse', 'deepeval']);

const datasetItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  groundTruth: z.string().optional(),
  contexts: z.array(z.string()).optional(),
});

const postSchema = z.object({
  projectId: z.string().optional(),
  strategyVersion: z.number().int().min(1),
  frameworks: z.array(frameworkSchema).min(1).optional(),
  runCount: z.number().int().min(1).max(3).optional(),
  reproducibilityKey: z.string().optional(),
  dataset: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    items: z.array(datasetItemSchema).min(1).max(500),
  }),
});

function normalizeProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function ensureProjectAccess(userId: string, projectId?: string) {
  if (!projectId) {
    return true;
  }
  return hasProjectAccess(userId, projectId);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeProjectId(searchParams.get('projectId') || undefined);
  const strategyVersionRaw = searchParams.get('strategyVersion');
  const datasetVersionId = searchParams.get('datasetVersionId') || undefined;
  const takeRaw = searchParams.get('take');

  const canAccess = await ensureProjectAccess(session.user.id, projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const strategyVersion =
    strategyVersionRaw && /^\d+$/.test(strategyVersionRaw)
      ? Number(strategyVersionRaw)
      : undefined;
  const take = takeRaw && /^\d+$/.test(takeRaw) ? Number(takeRaw) : undefined;

  const runs = await listEvalRuns({
    projectId,
    strategyVersion,
    datasetVersionId,
    take,
  });

  return successResponse({
    projectId: projectId || null,
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      strategyVersion: run.strategyVersion,
      resultVersion: run.resultVersion,
      totalCost: run.totalCost,
      retryCount: run.retryCount,
      reproducibilityKey: run.reproducibilityKey,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
      dataset: run.datasetVersion,
      metrics: run.parsedMetrics || null,
    })),
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const projectId = normalizeProjectId(parsed.data.projectId);
  const canAccess = await ensureProjectAccess(session.user.id, projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const orchestration = await runEvalOrchestration({
    actorId: session.user.id,
    projectId,
    strategyVersion: parsed.data.strategyVersion,
    dataset: parsed.data.dataset,
    frameworks: parsed.data.frameworks as EvalFramework[] | undefined,
    runCount: parsed.data.runCount,
    reproducibilityKey: parsed.data.reproducibilityKey,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_EVAL_ORCHESTRATION_COMPLETED',
    target: 'RAG_EVAL_RUN',
    targetId: orchestration.runs[orchestration.runs.length - 1]?.id || 'unknown',
    projectId,
    metadata: {
      strategyVersion: parsed.data.strategyVersion,
      datasetName: orchestration.datasetVersion.name,
      datasetVersion: orchestration.datasetVersion.datasetVersion,
      runCount: orchestration.runs.length,
      frameworks: orchestration.frameworks,
      reproducibilityKey: orchestration.reproducibilityKey,
      stability: orchestration.stability,
    },
  });

  return successResponse(
    {
      projectId: projectId || null,
      datasetVersion: {
        id: orchestration.datasetVersion.id,
        name: orchestration.datasetVersion.name,
        version: orchestration.datasetVersion.datasetVersion,
        itemCount: orchestration.datasetVersion.itemCount,
        checksum: orchestration.datasetVersion.checksum,
      },
      frameworks: orchestration.frameworks,
      reproducibilityKey: orchestration.reproducibilityKey,
      runs: orchestration.runs.map((run) => ({
        id: run.id,
        status: run.status,
        strategyVersion: run.strategyVersion,
        resultVersion: run.resultVersion,
        totalCost: run.totalCost,
        createdAt: run.createdAt,
        finishedAt: run.finishedAt,
        metrics: run.parsedMetrics || null,
      })),
      nfr12: orchestration.stability,
    },
    'Eval orchestration completed'
  );
}
