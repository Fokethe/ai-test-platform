import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { executeMultiSourceQuery } from '@/lib/ai/rag/multi-source-query';
import { writeAuditLog } from '@/lib/audit';

const requestSchema = z.object({
  query: z.string().min(1).max(2000),
  projectId: z.string().optional(),
  topK: z.number().int().min(1).max(50).optional(),
});

async function resolveAccessibleProjectIds(
  userId: string,
  explicitProjectId?: string
): Promise<{ projectIds: string[]; forbidden: boolean }> {
  if (explicitProjectId) {
    const allowed = await hasProjectAccess(userId, explicitProjectId);
    return {
      projectIds: allowed ? [explicitProjectId] : [],
      forbidden: !allowed,
    };
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
    select: { id: true },
  });

  return {
    projectIds: projects.map((item) => item.id),
    forbidden: false,
  };
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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const { query, projectId, topK = 10 } = parsed.data;
  const access = await resolveAccessibleProjectIds(session.user.id, projectId);

  if (access.forbidden) {
    return errors.forbidden();
  }

  if (access.projectIds.length === 0) {
    return successResponse({
      query,
      plans: [],
      sourceResults: [],
      mergedCandidates: [],
      meta: {
        totalCandidates: 0,
        failedSources: [],
        projectScopeCount: 0,
      },
    });
  }

  const result = await executeMultiSourceQuery({
    query,
    projectIds: access.projectIds,
    topK,
  });

  const failedSources = result.sourceResults
    .filter((item) => !item.success)
    .map((item) => ({
      source: item.source,
      error: item.error || 'UNKNOWN_ERROR',
    }));

  if (failedSources.length > 0) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'MULTI_SOURCE_QUERY_PARTIAL_FAILURE',
      target: 'KNOWLEDGE_MULTI_SOURCE_QUERY',
      targetId: projectId || 'multi-project-scope',
      projectId: projectId || (access.projectIds.length === 1 ? access.projectIds[0] : undefined),
      metadata: {
        queryPreview: query.slice(0, 120),
        failedSources,
        projectScopeCount: access.projectIds.length,
      },
    });
  }

  return successResponse({
    query,
    plans: result.plans,
    sourceResults: result.sourceResults,
    mergedCandidates: result.mergedCandidates,
    meta: {
      totalCandidates: result.mergedCandidates.length,
      failedSources,
      projectScopeCount: access.projectIds.length,
    },
  });
}
