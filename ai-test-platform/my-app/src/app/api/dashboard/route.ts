/**
 * Dashboard API
 * 获取仪表盘统计数据
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/dashboard?days=7
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    
    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    // 今天的开始时间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 并行获取各项统计
    const [
      totalTestCases,
      todayExecutions,
      totalExecutions,
      passedExecutions,
      failedExecutions,
      testSuites,
      activeSuites,
      recentRuns,
      executionsByDay,
    ] = await Promise.all([
      // 总用例数
      prisma.test.count({
        where: { status: 'ACTIVE' },
      }),
      
      // 今日执行数
      prisma.run.count({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
      
      // 总执行次数
      prisma.execution.count(),
      
      // 通过的执行次数
      prisma.execution.count({
        where: { status: 'PASSED' },
      }),
      
      // 失败的执行次数
      prisma.execution.count({
        where: { 
          status: { in: ['FAILED', 'ERROR'] },
          createdAt: {
            gte: startDate,
          },
        },
      }),
      
      // 测试套件总数
      prisma.test.count({
        where: { type: 'SUITE' },
      }),
      
      // 有效套件数
      prisma.test.count({
        where: { type: 'SUITE', status: 'ACTIVE' },
      }),
      
      // 最近执行记录
      prisma.execution.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          test: {
            select: { name: true },
          },
        },
      }),
      
      // 按天统计通过/失败
      prisma.execution.groupBy({
        by: ['status', 'createdAt'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: { id: true },
      }),
    ]);

    // 计算通过率
    const passRate = totalExecutions > 0 
      ? Math.round((passedExecutions / totalExecutions) * 100) 
      : 0;

    // 格式化趋势数据（按天统计通过和失败）
    const trend = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      let passed = 0;
      let failed = 0;
      
      executionsByDay.forEach(exec => {
        const execDate = exec.createdAt.toISOString().split('T')[0];
        if (execDate === dateStr) {
          if (exec.status === 'PASSED') {
            passed += exec._count.id;
          } else if (exec.status === 'FAILED' || exec.status === 'ERROR') {
            failed += exec._count.id;
          }
        }
      });
      
      return {
        date: dateStr,
        passed,
        failed,
      };
    });

    // 格式化最近执行记录
    const recentExecutions = recentRuns.map(exec => ({
      id: exec.id,
      testCaseTitle: exec.test?.name || '未知用例',
      status: exec.status,
      startedAt: exec.startedAt?.toISOString() || null,
      duration: exec.duration,
    }));

    // 返回符合页面期望的数据格式
    const dashboardData = {
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
        recentExecutions,
      },
    };

    return Response.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return Response.json({
      code: 500,
      message: '获取仪表盘数据失败',
      data: null,
    }, { status: 500 });
  }
}
