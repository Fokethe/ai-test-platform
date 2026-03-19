import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  buildSemanticIndexUnits,
  getActiveIndexBuild,
  IndexSourceType,
  listIndexBuildVersions,
  loadIndexSource,
} from '@/lib/ai/rag/index-unit-builder';

const sourceTypeSchema = z.enum(['KNOWLEDGE_ENTRY', 'AI_REQUIREMENT']);

const postSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceId: z.string().min(1),
  projectId: z.string().optional(),
  options: z
    .object({
      targetChunkSize: z.number().int().min(120).max(4000).optional(),
      minChunkSize: z.number().int().min(60).max(2000).optional(),
      overlapSentences: z.number().int().min(0).max(3).optional(),
      maxChunks: z.number().int().min(1).max(1000).optional(),
    })
    .optional(),
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

function parseSourceType(value: string | null): IndexSourceType | null {
  if (value === 'KNOWLEDGE_ENTRY' || value === 'AI_REQUIREMENT') {
    return value;
  }
  return null;
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

  const result = await buildSemanticIndexUnits({
    actorId: session.user.id,
    source: {
      ...source,
      projectId,
    },
    options: parsed.data.options,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_INDEX_BUILD_CREATED',
    target: 'RAG_INDEX_BUILD',
    targetId: result.build.id,
    projectId,
    metadata: {
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      version: result.build.version,
      unitCount: result.build.unitCount,
      qualityScore: result.build.qualityScore,
    },
  });

  return successResponse(
    {
      source: {
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
        projectId: projectId || null,
        title: source.title,
      },
      build: {
        id: result.build.id,
        version: result.build.version,
        qualityScore: result.build.qualityScore,
        unitCount: result.build.unitCount,
        strategy: JSON.parse(result.build.strategyJson),
      },
      units: result.processResult.units,
      metrics: {
        totalTokens: result.processResult.totalTokens,
        qualityScore: result.processResult.qualityScore,
      },
    },
    'Index units built'
  );
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

  const activeBuild = await getActiveIndexBuild({
    sourceType,
    sourceId,
  });

  if (!activeBuild) {
    return successResponse({
      source: {
        sourceType,
        sourceId,
      },
      activeBuild: null,
      versions: [],
    });
  }

  const canAccessProject = await ensureProjectAccess(session.user.id, activeBuild.projectId || undefined);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const versions = await listIndexBuildVersions({
    sourceType,
    sourceId,
  });

  return successResponse({
    source: {
      sourceType,
      sourceId,
      projectId: activeBuild.projectId || null,
    },
    activeBuild: {
      id: activeBuild.id,
      version: activeBuild.version,
      qualityScore: activeBuild.qualityScore,
      unitCount: activeBuild.unitCount,
      strategy: JSON.parse(activeBuild.strategyJson),
      units: activeBuild.units.map((unit) => ({
        id: unit.id,
        unitKey: unit.unitKey,
        unitIndex: unit.unitIndex,
        content: unit.content,
        tokenCount: unit.tokenCount,
        startOffset: unit.startOffset,
        endOffset: unit.endOffset,
        metadata: unit.metadata ? JSON.parse(unit.metadata) : null,
      })),
    },
    versions,
  });
}
