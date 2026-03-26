import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { getLangfuse } from '@/lib/observability/langfuse-client';

function getDateLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function toDayCount(value: string | null) {
  const parsed = Number(value || '7');
  if (!Number.isFinite(parsed)) {
    return 7;
  }
  return Math.max(1, Math.min(90, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const days = toDayCount(searchParams.get('days'));

  let totalCost = 0;
  let totalCalls = 0;
  let totalTokens = 0;
  let costByModel: Array<{ model: string; tokens: number; cost: number; calls: number }> = [];

  try {
    const client = getLangfuse();
    const stats = client.getCostStatistics();
    totalCost = Number(stats.totalCost || 0);
    totalCalls = Number(stats.callCount || 0);
    totalTokens = Object.values(stats.byModel || {}).reduce(
      (sum, item) => sum + Number(item.tokens || 0),
      0
    );
    costByModel = Object.entries(stats.byModel || {}).map(([model, item]) => ({
      model,
      tokens: Number(item.tokens || 0),
      cost: Number(item.cost || 0),
      calls: Number(item.calls || 0),
    }));
  } catch {
    // Langfuse not initialized - fall back to zero stats.
  }

  const dailyStats = Array.from({ length: days }).map((_, index) => ({
    date: getDateLabel(days - index - 1),
    tokens: 0,
    cost: 0,
    calls: 0,
  }));
  if (dailyStats.length > 0) {
    dailyStats[dailyStats.length - 1] = {
      date: dailyStats[dailyStats.length - 1].date,
      tokens: totalTokens,
      cost: Number(totalCost.toFixed(6)),
      calls: totalCalls,
    };
  }

  return successResponse({
    totalTokens,
    totalCalls,
    avgLatency: 0,
    errorRate: 0,
    totalCost: Number(totalCost.toFixed(6)),
    successRate: totalCalls > 0 ? 100 : 0,
    avgResponseTime: 0,
    totalRequests: totalCalls,
    costByModel,
    dailyStats,
  });
}
