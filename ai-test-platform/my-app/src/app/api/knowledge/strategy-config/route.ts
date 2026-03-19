import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getLatestRagStrategyConfig,
  resolveRagStrategyConfig,
  saveRagStrategyConfig,
} from '@/lib/ai/rag/strategy-config';

const togglesSchema = z
  .object({
    multiQuery: z.boolean().optional(),
    hyde: z.boolean().optional(),
    decomposition: z.boolean().optional(),
    fusion: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.multiQuery !== undefined ||
      value.hyde !== undefined ||
      value.decomposition !== undefined ||
      value.fusion !== undefined,
    { message: 'At least one strategy toggle must be provided' }
  );

const updateSchema = z.object({
  projectId: z.string().optional(),
  toggles: togglesSchema,
});

function normalizeProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeProjectId(searchParams.get('projectId') || undefined);

  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const latest = await getLatestRagStrategyConfig(projectId);
  const resolved = await resolveRagStrategyConfig({ projectId });

  return successResponse({
    configId: latest?.id,
    projectId: projectId || null,
    version: resolved.version,
    source: resolved.source,
    toggles: resolved.toggles,
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
  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const saved = await saveRagStrategyConfig({
    actorId: session.user.id,
    projectId,
    toggles: parsed.data.toggles,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_STRATEGY_CONFIG_UPDATED',
    target: 'RAG_STRATEGY_CONFIG',
    targetId: saved.id,
    projectId: saved.projectId || undefined,
    metadata: {
      version: saved.version,
      toggles: {
        multiQuery: saved.multiQuery,
        hyde: saved.hyde,
        decomposition: saved.decomposition,
        fusion: saved.fusion,
      },
    },
  });

  return successResponse(
    {
      configId: saved.id,
      projectId: saved.projectId || null,
      version: saved.version,
      source: 'persisted',
      toggles: {
        multiQuery: saved.multiQuery,
        hyde: saved.hyde,
        decomposition: saved.decomposition,
        fusion: saved.fusion,
      },
    },
    'Strategy config updated'
  );
}
