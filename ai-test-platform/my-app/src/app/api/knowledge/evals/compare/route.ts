import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { compareStrategyVersions, toComparisonCsv } from '@/lib/ai/rag/eval-service';

function normalizeProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeProjectId(searchParams.get('projectId') || undefined);
  const datasetVersionId = searchParams.get('datasetVersionId') || '';
  const leftStrategyVersion = parsePositiveInt(searchParams.get('leftStrategyVersion'));
  const rightStrategyVersion = parsePositiveInt(searchParams.get('rightStrategyVersion'));
  const format = (searchParams.get('format') || 'json').toLowerCase();

  if (!datasetVersionId || !leftStrategyVersion || !rightStrategyVersion) {
    return errors.badRequest(
      'datasetVersionId, leftStrategyVersion, rightStrategyVersion are required'
    );
  }

  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  const comparison = await compareStrategyVersions({
    projectId,
    datasetVersionId,
    leftStrategyVersion,
    rightStrategyVersion,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_EVAL_STRATEGY_COMPARISON_VIEWED',
    target: 'RAG_EVAL_COMPARISON',
    targetId: datasetVersionId,
    projectId,
    metadata: {
      leftStrategyVersion,
      rightStrategyVersion,
      anomalies: comparison.anomalies,
    },
  });

  if (format === 'csv') {
    const csv = toComparisonCsv(comparison);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="strategy-comparison-${leftStrategyVersion}-vs-${rightStrategyVersion}.csv"`,
      },
    });
  }

  return successResponse({
    projectId: projectId || null,
    datasetVersionId,
    comparison,
  });
}
