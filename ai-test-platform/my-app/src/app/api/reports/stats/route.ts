import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取执行统计
    const executions = await prisma.testExecution.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        testCase: {
          include: {
            page: {
              include: {
                system: {
                  include: {
                    project: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 基础统计
    const totalExecutions = executions.length;
    const passedCount = executions.filter((e) => e.status === 'PASSED').length;
    const failedCount = executions.filter((e) => e.status === 'FAILED').length;
    const passRate = totalExecutions > 0 ? Math.round((passedCount / totalExecutions) * 100) : 0;
    const avgDuration = totalExecutions > 0
      ? Math.round(
          executions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions
        )
      : 0;

    // 按天统计
    const executionsByDay: Record<string, { date: string; count: number; passed: number; failed: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      executionsByDay[dateStr] = { date: dateStr, count: 0, passed: 0, failed: 0 };
    }

    executions.forEach((e) => {
      const dateStr = e.createdAt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (executionsByDay[dateStr]) {
        executionsByDay[dateStr].count++;
        if (e.status === 'PASSED') {
          executionsByDay[dateStr].passed++;
        } else if (e.status === 'FAILED') {
          executionsByDay[dateStr].failed++;
        }
      }
    });

    // 按项目统计
    const projectMap: Record<string, number> = {};
    executions.forEach((e) => {
      const projectName = e.testCase?.page?.system?.project?.name || '未知项目';
      projectMap[projectName] = (projectMap[projectName] || 0) + 1;
    });
    const executionsByProject = Object.entries(projectMap).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      totalExecutions,
      passedCount,
      failedCount,
      passRate,
      avgDuration,
      executionsByDay: Object.values(executionsByDay),
      executionsByProject,
    });
  } catch (error) {
    console.error('获取报告统计失败:', error);
    return NextResponse.json({ error: '获取报告统计失败' }, { status: 500 });
  }
}
