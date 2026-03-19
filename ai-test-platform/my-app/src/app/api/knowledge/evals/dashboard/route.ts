import { NextRequest } from 'next/server';
import { RagEvalGuardType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getEvalQualityCostDashboard,
  recordEvalRefreshGuard,
} from '@/lib/ai/rag/eval-service';

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
  const daysRaw = searchParams.get('days');
  const days = daysRaw && /^\d+$/.test(daysRaw) ? Number(daysRaw) : 30;

  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  const dashboard = await getEvalQualityCostDashboard({
    projectId,
    days,
    role: session.user.role,
  });

  let guard: Awaited<ReturnType<typeof recordEvalRefreshGuard>> | undefined;
  if (!dashboard.refresh.withinSla && dashboard.refresh.latencyMs !== null) {
    guard = await recordEvalRefreshGuard({
      projectId,
      guardType: RagEvalGuardType.DASHBOARD_REFRESH,
      observedLatencyMs: dashboard.refresh.latencyMs,
      thresholdMs: dashboard.refresh.slaMs,
      details: {
        reason: 'dashboard_refresh_exceeds_sla',
        roleScope: dashboard.roleScope,
      },
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_EVAL_DASHBOARD_VIEWED',
    target: 'RAG_EVAL_DASHBOARD',
    targetId: projectId || 'global',
    projectId,
    metadata: {
      days,
      roleScope: dashboard.roleScope,
      withinSla: dashboard.refresh.withinSla,
      guardTriggered: !!guard,
    },
  });

  return successResponse({
    projectId: projectId || null,
    ...dashboard,
    guard: guard
      ? {
          eventId: guard.event.id,
          status: guard.event.status,
          fallbackApplied: guard.fallbackApplied,
          recommendation: guard.recommendation,
        }
      : null,
  });
}
