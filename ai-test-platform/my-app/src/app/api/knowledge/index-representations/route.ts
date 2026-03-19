import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  buildMultiRepresentationIndex,
  getRepresentationSnapshot,
} from '@/lib/ai/rag/representation-indexer';
import { IndexSourceType, loadIndexSource } from '@/lib/ai/rag/index-unit-builder';

const sourceTypeSchema = z.enum(['KNOWLEDGE_ENTRY', 'AI_REQUIREMENT']);

const postSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceId: z.string().min(1),
  projectId: z.string().optional(),
  summaryMaxChars: z.number().int().min(60).max(1000).optional(),
  requestedStrategyName: z.string().optional(),
  simulateFailureAt: z.enum(['vector', 'graph', 'none']).optional(),
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

  const result = await buildMultiRepresentationIndex({
    actorId: session.user.id,
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    projectId,
    summaryMaxChars: parsed.data.summaryMaxChars,
    requestedStrategyName: parsed.data.requestedStrategyName,
    simulateFailureAt: parsed.data.simulateFailureAt,
  });

  if (result.embedding.fallbackApplied) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'EMBEDDING_STRATEGY_FALLBACK',
      target: 'RAG_REPRESENTATION_INDEX',
      targetId: result.buildId,
      projectId,
      metadata: {
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
        fallbackReason: result.embedding.fallbackReason,
        configuredStrategyName: result.embedding.configuredStrategyName,
        strategyNameUsed: result.embedding.strategyNameUsed,
      },
    });
  }

  if (result.compensationApplied) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'RAG_REPRESENTATION_WRITE_COMPENSATED',
      target: 'RAG_REPRESENTATION_INDEX',
      targetId: result.buildId,
      projectId,
      metadata: {
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
        failedStage: result.failedStage,
        error: result.error,
      },
    });
    return successResponse(
      {
        status: 'degraded',
        ...result,
      },
      'Representation write failed and compensation applied'
    );
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_MULTI_REPRESENTATION_INDEX_BUILT',
    target: 'RAG_REPRESENTATION_INDEX',
    targetId: result.buildId,
    projectId,
    metadata: {
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      representationCount: result.representationCount,
      summaryCount: result.summaryCount,
      vectorWriteCount: result.vectorWriteCount,
      graphWriteCount: result.graphWriteCount,
    },
  });

  return successResponse({
    status: 'success',
    ...result,
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

  const snapshot = await getRepresentationSnapshot({
    sourceType,
    sourceId,
  });

  return successResponse({
    source: {
      sourceType,
      sourceId,
      projectId: source.projectId || null,
      title: source.title,
    },
    activeBuild: snapshot.activeBuild
      ? {
          id: snapshot.activeBuild.id,
          version: snapshot.activeBuild.version,
          unitCount: snapshot.activeBuild.unitCount,
        }
      : null,
    vectorEntries: snapshot.vectorEntries.map((item) => ({
      id: item.id,
      vectorKey: item.vectorKey,
      representationType: item.representationType,
      strategyName: item.strategyName,
      embeddingDim: item.embeddingDim,
      summary: item.summary,
    })),
    graphNodes: snapshot.graphNodes.map((item) => ({
      id: item.id,
      nodeKey: item.nodeKey,
      representationType: item.representationType,
      summary: item.summary,
    })),
  });
}
