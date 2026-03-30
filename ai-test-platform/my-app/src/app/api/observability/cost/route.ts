import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { getLangfuse } from '@/lib/observability/langfuse-client';
import { prisma } from '@/lib/prisma';

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

  const dailyStats = Array.from({ length: days }).map((_, index) => ({
    date: getDateLabel(days - index - 1),
    tokens: 0,
    cost: 0,
    calls: 0,
  }));

  let totalCost = 0;
  let totalCalls = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  let failedCalls = 0;
  let costByModel: Array<{ model: string; tokens: number; cost: number; calls: number }> = [];

  const statModel = (prisma as any).aiModelCallStat;

  if (statModel?.findMany) {
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (days - 1));

      const rows = (await statModel.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          model: true,
          totalTokens: true,
          estimatedCost: true,
          latencyMs: true,
          success: true,
          createdAt: true,
        },
      })) as Array<{
        model: string;
        totalTokens: number;
        estimatedCost: number;
        latencyMs: number;
        success: boolean;
        createdAt: Date;
      }>;

      const byModel = new Map<string, { tokens: number; cost: number; calls: number }>();
      const byDay = new Map<string, { tokens: number; cost: number; calls: number }>();

      for (const row of rows) {
        totalCalls += 1;
        totalTokens += Number(row.totalTokens || 0);
        totalCost += Number(row.estimatedCost || 0);
        totalLatency += Number(row.latencyMs || 0);
        if (!row.success) {
          failedCalls += 1;
        }

        const modelBucket = byModel.get(row.model) || { tokens: 0, cost: 0, calls: 0 };
        modelBucket.tokens += Number(row.totalTokens || 0);
        modelBucket.cost += Number(row.estimatedCost || 0);
        modelBucket.calls += 1;
        byModel.set(row.model, modelBucket);

        const dayKey = row.createdAt.toISOString().slice(0, 10);
        const dayBucket = byDay.get(dayKey) || { tokens: 0, cost: 0, calls: 0 };
        dayBucket.tokens += Number(row.totalTokens || 0);
        dayBucket.cost += Number(row.estimatedCost || 0);
        dayBucket.calls += 1;
        byDay.set(dayKey, dayBucket);
      }

      costByModel = Array.from(byModel.entries())
        .map(([model, item]) => ({
          model,
          tokens: item.tokens,
          cost: Number(item.cost.toFixed(6)),
          calls: item.calls,
        }))
        .sort((a, b) => b.cost - a.cost);

      for (const item of dailyStats) {
        const day = byDay.get(item.date);
        if (!day) {
          continue;
        }
        item.tokens = day.tokens;
        item.cost = Number(day.cost.toFixed(6));
        item.calls = day.calls;
      }
    } catch (dbError) {
      console.error('Failed to query ai_model_call_stats, fallback to langfuse:', dbError);
    }
  }

  if (totalCalls === 0) {
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
        cost: Number(Number(item.cost || 0).toFixed(6)),
        calls: Number(item.calls || 0),
      }));

      if (dailyStats.length > 0) {
        dailyStats[dailyStats.length - 1] = {
          date: dailyStats[dailyStats.length - 1].date,
          tokens: totalTokens,
          cost: Number(totalCost.toFixed(6)),
          calls: totalCalls,
        };
      }
    } catch {
      // Langfuse unavailable, keep zero values.
    }
  }

  const avgLatency = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;
  const errorRate = totalCalls > 0 ? Number(((failedCalls / totalCalls) * 100).toFixed(2)) : 0;
  const successRate = totalCalls > 0 ? Number((100 - errorRate).toFixed(2)) : 0;

  return successResponse({
    totalTokens,
    totalCalls,
    avgLatency,
    errorRate,
    totalCost: Number(totalCost.toFixed(6)),
    successRate,
    avgResponseTime: avgLatency,
    totalRequests: totalCalls,
    costByModel,
    dailyStats,
  });
}
