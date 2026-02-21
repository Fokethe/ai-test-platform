import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/dashboard - 获取仪表盘数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // 1. 获取总用例数
    const totalTestCases = await prisma.testCase.count();

    // 2. 获取今日执行次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayExecutions = await prisma.execution.count({
      where: {
        startedAt: {
          gte: today,
        },
      },
    });

    // 3. 获取最近N天的执行统计
    const executions = await prisma.execution.findMany({
      where: {
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        startedAt: true,
      },
    });

    // 计算通过率和失败数
    const passedCount = executions.filter(e => e.status === 'PASSED').length;
    const failedCount = executions.filter(e => e.status === 'FAILED').length;
    const totalCount = executions.length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    // 4. 生成趋势数据（按日期分组）
    const trendMap = new Map<string, { passed: number; failed: number }>();
    
    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, { passed: 0, failed: 0 });
    }

    // 填充执行数据
    executions.forEach(exec => {
      const dateStr = exec.startedAt?.toISOString().split('T')[0];
      if (dateStr && trendMap.has(dateStr)) {
        const current = trendMap.get(dateStr)!;
        if (exec.status === 'PASSED') {
          current.passed++;
        } else if (exec.status === 'FAILED') {
          current.failed++;
        }
      }
    });

    // 转换为数组并排序
    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        passed: data.passed,
        failed: data.failed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. 获取最近执行记录
    const recentExecutions = await prisma.execution.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        testCase: {
          select: { title: true },
        },
      },
    });

    // 6. 获取测试套件状态
    const testSuites = await prisma.testSuite.count();
    const activeSuites = await prisma.testSuite.count({
      where: {
        cases: {
          some: {},
        },
      },
    });

    return NextResponse.json(successResponse({
      stats: {
        totalTestCases,
        todayExecutions,
        passRate,
        failedCount,
        totalExecutions: totalCount,
        testSuites,
        activeSuites,
      },
      trend,
      recentExecutions: recentExecutions.map(e => ({
        id: e.id,
        testCaseTitle: e.testCase?.title || '未知用例',
        status: e.status,
        startedAt: e.startedAt,
        duration: e.duration,
      })),
    }));
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return NextResponse.json(
      errorResponse('获取仪表盘数据失败'),
      { status: 500 }
    );
  }
}
