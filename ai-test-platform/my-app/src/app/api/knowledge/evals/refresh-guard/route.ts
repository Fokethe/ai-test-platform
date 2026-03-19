import { NextRequest } from 'next/server';
import { z } from 'zod';
import { RagEvalGuardType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  listRefreshGuardEvents,
  recordEvalRefreshGuard,
} from '@/lib/ai/rag/eval-service';

const postSchema = z.object({
  projectId: z.string().optional(),
  guardType: z.enum(['DASHBOARD_REFRESH', 'EVAL_RETRY']).optional(),
  observedLatencyMs: z.number().int().min(0),
  thresholdMs: z.number().int().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
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
  const guardTypeRaw = searchParams.get('guardType');
  const takeRaw = searchParams.get('take');
  const take = takeRaw && /^\d+$/.test(takeRaw) ? Number(takeRaw) : undefined;

  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  const guardType =
    guardTypeRaw === 'DASHBOARD_REFRESH' || guardTypeRaw === 'EVAL_RETRY'
      ? (guardTypeRaw as RagEvalGuardType)
      : undefined;
  const events = await listRefreshGuardEvents({
    projectId,
    guardType,
    take,
  });

  return successResponse({
    projectId: projectId || null,
    events: events.map((event) => ({
      id: event.id,
      guardType: event.guardType,
      status: event.status,
      observedLatencyMs: event.observedLatencyMs,
      thresholdMs: event.thresholdMs,
      details: event.details || null,
      createdAt: event.createdAt,
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
  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  const guard = await recordEvalRefreshGuard({
    projectId,
    guardType: parsed.data.guardType as RagEvalGuardType | undefined,
    observedLatencyMs: parsed.data.observedLatencyMs,
    thresholdMs: parsed.data.thresholdMs,
    details: parsed.data.details,
  });

  if (guard.fallbackApplied) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'RAG_EVAL_REFRESH_GUARD_TRIGGERED',
      target: 'RAG_EVAL_REFRESH_GUARD_EVENT',
      targetId: guard.event.id,
      projectId,
      metadata: {
        guardType: guard.event.guardType,
        status: guard.event.status,
        recommendation: guard.recommendation,
      },
    });
  }

  return successResponse({
    projectId: projectId || null,
    event: {
      id: guard.event.id,
      guardType: guard.event.guardType,
      status: guard.event.status,
      observedLatencyMs: guard.event.observedLatencyMs,
      thresholdMs: guard.event.thresholdMs,
      createdAt: guard.event.createdAt,
    },
    fallbackApplied: guard.fallbackApplied,
    recommendation: guard.recommendation,
  });
}
