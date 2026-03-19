import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getLatestEmbeddingStrategyConfig,
  listAvailableEmbeddingStrategies,
  resolveEmbeddingStrategyConfig,
  saveEmbeddingStrategyConfig,
} from '@/lib/ai/rag/embedding-strategies';

const updateSchema = z.object({
  projectId: z.string().optional(),
  strategyName: z.string().min(1),
  dimension: z.number().int().min(16).max(4096),
  fallbackTo: z.string().optional(),
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

  const canAccessProject = await ensureProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const [activeConfig, resolved] = await Promise.all([
    getLatestEmbeddingStrategyConfig(projectId),
    resolveEmbeddingStrategyConfig({ projectId }),
  ]);

  return successResponse({
    projectId: projectId || null,
    availableStrategies: listAvailableEmbeddingStrategies(),
    activeConfig: activeConfig
      ? {
          id: activeConfig.id,
          strategyName: activeConfig.strategyName,
          dimension: activeConfig.dimension,
          fallbackTo: activeConfig.fallbackTo,
          version: activeConfig.version,
        }
      : null,
    effective: resolved,
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const projectId = normalizeProjectId(parsed.data.projectId);
  const canAccessProject = await ensureProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  try {
    const saved = await saveEmbeddingStrategyConfig({
      actorId: session.user.id,
      projectId,
      strategyName: parsed.data.strategyName,
      dimension: parsed.data.dimension,
      fallbackTo: parsed.data.fallbackTo,
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: 'RAG_EMBEDDING_STRATEGY_UPDATED',
      target: 'RAG_EMBEDDING_STRATEGY',
      targetId: saved.id,
      projectId: saved.projectId || undefined,
      metadata: {
        strategyName: saved.strategyName,
        dimension: saved.dimension,
        fallbackTo: saved.fallbackTo,
        version: saved.version,
      },
    });

    return successResponse(
      {
        id: saved.id,
        projectId: saved.projectId || null,
        strategyName: saved.strategyName,
        dimension: saved.dimension,
        fallbackTo: saved.fallbackTo,
        version: saved.version,
      },
      'Embedding strategy updated'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update strategy';
    return errors.badRequest(message);
  }
}
