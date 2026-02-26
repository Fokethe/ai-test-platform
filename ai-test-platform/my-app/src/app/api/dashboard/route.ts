/**
 * Dashboard API
 * 获取仪表盘统计数据（简化版）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/dashboard?days=7
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    // 今天的开始时间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 基础统计
    const totalTestCases = await prisma.test.count({ where: { status: 'ACTIVE' } });
    const todayExecutions = await prisma.run.count({ where: { createdAt: { gte: todayStart } } });
    const testSuites = await prisma.test.count({ where: { type: 'SUITE' } });
    const activeSuites = await prisma.test.count({ where: { type: 'SUITE', status: 'ACTIVE' } });

    // Execution 统计（带错误处理）
    let totalExecutions = 0;
    let passedExecutions = 0;
    let failedExecutions = 0;
    
    try {
      totalExecutions = await prisma.execution.count();
      passedExecutions = await prisma.execution.count({ where: { status: 'PASSED' } });
      failedExecutions = await prisma.execution.count({ where: { status: 'FAILED' } });
    } catch (e) {
      console.log('Execution count error:', e);
    }

    const passRate = totalExecutions > 0 
      ? Math.round((passedExecutions / totalExecutions) * 100) 
      : 0;

    // 生成趋势数据
    const days = 7;
    const trend = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        passed: 0,
        failed: 0,
      };
    });

    return Response.json({
      code: 0,
      message: 'success',
      data: {
        stats: {
          totalTestCases,
          todayExecutions,
          passRate,
          failedCount: failedExecutions,
          totalExecutions,
          testSuites,
          activeSuites,
        },
        trend,
        recentExecutions: [],
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return Response.json({
      code: 500,
      message: '获取仪表盘数据失败: ' + (error instanceof Error ? error.message : '未知错误'),
      data: null,
    }, { status: 500 });
  }
}
