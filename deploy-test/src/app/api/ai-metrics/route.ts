/**
 * AI Metrics API
 * AI 性能指标 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// GET /api/ai-metrics - 获取 AI 性能指标
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 模拟数据 - 实际应该查询数据库或缓存
    const metrics = {
      totalRequests: 1250,
      avgResponseTime: 1250, // ms
      totalCost: 12.5,
      successRate: 98.5,
      dailyStats: [
        { date: '2026-03-06', requests: 180, cost: 1.8 },
        { date: '2026-03-07', requests: 195, cost: 1.95 },
        { date: '2026-03-08', requests: 210, cost: 2.1 },
        { date: '2026-03-09', requests: 175, cost: 1.75 },
        { date: '2026-03-10', requests: 220, cost: 2.2 },
        { date: '2026-03-11', requests: 270, cost: 2.7 },
        { date: '2026-03-12', requests: 0, cost: 0 },
      ],
      modelStats: [
        { model: 'gpt-4', requests: 450, avgLatency: 2100 },
        { model: 'gpt-3.5', requests: 800, avgLatency: 800 },
      ],
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch AI metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
