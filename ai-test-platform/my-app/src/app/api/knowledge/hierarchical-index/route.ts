import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { IndexSourceType, loadIndexSource } from '@/lib/ai/rag/index-unit-builder';
import {
  getHierarchicalIndexSnapshot,
  layeredRecallFromNodes,
  runHierarchicalIndexJob,
} from '@/lib/ai/rag/hierarchical-indexer';

const sourceTypeSchema = z.enum(['KNOWLEDGE_ENTRY', 'AI_REQUIREMENT']);

const postSchema = z.object({
  action: z.enum(['start', 'resume']).optional(),
  sourceType: sourceTypeSchema,
  sourceId: z.string().min(1),
  projectId: z.string().optional(),
  jobId: z.string().optional(),
  simulateInterruptStage: z.enum(['cluster-root', 'cluster-sub', 'finalize']).optional(),
});

function normalizeProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSourceType(value: string | null): IndexSourceType | null {
  if (value === 'KNOWLEDGE_ENTRY' || value === 'AI_REQUIREMENT') {
    return value;
  }
  return null;
}

async function ensureProjectAccess(userId: string, projectId?: string) {
  if (!projectId) {
    return true;
  }
  return hasProjectAccess(userId, projectId);
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

  const source = await loadIndexSource(parsed.data.sourceType, parsed.data.sourceId);
  if (!source) {
    return errors.notFound('Index source');
  }

  const explicitProjectId = normalizeProjectId(parsed.data.projectId);
  const sourceProjectId = normalizeProjectId(source.projectId);
  if (explicitProjectId && sourceProjectId && explicitProjectId !== sourceProjectId) {
    return errors.badRequest('projectId does not match source ownership');
  }
  const projectId = explicitProjectId || sourceProjectId;

  const canAccessProject = await ensureProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const result = await runHierarchicalIndexJob({
    actorId: session.user.id,
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    projectId,
    action: parsed.data.action || 'start',
    jobId: parsed.data.jobId,
    simulateInterruptStage: parsed.data.simulateInterruptStage,
  });

  if (result.status === 'FAILED') {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'RAG_HIERARCHICAL_INDEX_FAILED',
      target: 'RAG_HIERARCHICAL_INDEX_JOB',
      targetId: result.jobId,
      projectId,
      metadata: {
        sourceType: result.sourceType,
        sourceId: result.sourceId,
        stage: result.stage,
        error: result.error,
      },
    });
    return successResponse(
      {
        ...result,
        status: 'failed',
      },
      'Hierarchical index interrupted'
    );
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_HIERARCHICAL_INDEX_COMPLETED',
    target: 'RAG_HIERARCHICAL_INDEX_JOB',
    targetId: result.jobId,
    projectId,
    metadata: {
      sourceType: result.sourceType,
      sourceId: result.sourceId,
      nodeCount: result.nodeCount,
      checkpointCount: result.checkpointCount,
      recoveredFromJobId: result.recoveredFromJobId,
      recoveredWithinSla: result.recoveredWithinSla,
    },
  });

  return successResponse({
    ...result,
    status: 'completed',
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const sourceType = parseSourceType(searchParams.get('sourceType'));
  const sourceId = searchParams.get('sourceId')?.trim();
  if (!sourceType || !sourceId) {
    return errors.badRequest('sourceType and sourceId are required');
  }

  const source = await loadIndexSource(sourceType, sourceId);
  if (!source) {
    return errors.notFound('Index source');
  }

  const canAccessProject = await ensureProjectAccess(
    session.user.id,
    normalizeProjectId(source.projectId)
  );
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const snapshot = await getHierarchicalIndexSnapshot({
    sourceType,
    sourceId,
  });
  const recallQuery = searchParams.get('recallQuery')?.trim();
  const topKParam = searchParams.get('topK');
  const topK = topKParam ? Number(topKParam) : undefined;

  const levels: Record<string, number> = {};
  snapshot.nodes.forEach((node) => {
    const key = `L${node.level}`;
    levels[key] = (levels[key] || 0) + 1;
  });
  const layeredRecall =
    recallQuery && snapshot.nodes.length > 0
      ? layeredRecallFromNodes({
          query: recallQuery,
          nodes: snapshot.nodes.map((node) => ({
            id: node.id,
            level: node.level,
            summary: node.summary,
            unitRefsJson: node.unitRefsJson,
          })),
          topK: Number.isFinite(topK) ? topK : undefined,
        })
      : [];

  return successResponse({
    source: {
      sourceType,
      sourceId,
      projectId: source.projectId || null,
      title: source.title,
    },
    latestJob: snapshot.latestJob
      ? {
          id: snapshot.latestJob.id,
          status: snapshot.latestJob.status,
          stage: snapshot.latestJob.stage,
          recoveredFromJobId: snapshot.latestJob.recoveredFromJobId,
          startedAt: snapshot.latestJob.startedAt,
          finishedAt: snapshot.latestJob.finishedAt,
          lastError: snapshot.latestJob.lastError,
        }
      : null,
    checkpointCount: snapshot.checkpoints.length,
    nodeCount: snapshot.nodes.length,
    levels,
    layeredRecall,
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      level: node.level,
      nodeKey: node.nodeKey,
      clusterKey: node.clusterKey,
      summary: node.summary,
      unitRefs: JSON.parse(node.unitRefsJson),
    })),
  });
}
