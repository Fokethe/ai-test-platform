import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/executions/status - 获取正在执行的测试状态
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // Run queries in parallel for better performance with optimized field selection
    const [runningExecutions, recentExecutions, stats] = await Promise.all([
      // 获取正在执行的测试
      prisma.testExecution.findMany({
        where: {
          status: 'RUNNING',
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          testCase: {
            select: {
              id: true,
              title: true,
            },
          },
          run: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      
      // 获取最近完成的测试
      prisma.testExecution.findMany({
        where: {
          status: { in: ['PASSED', 'FAILED', 'TIMEOUT'] },
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          testCase: {
            select: {
              id: true,
              title: true,
            },
          },
          run: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      
      // 统计信息
      prisma.testExecution.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    const statusCount = stats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    const duration = Date.now() - startTime;
    console.log(`[API Timing] GET /api/executions/status: ${duration}ms (running: ${runningExecutions.length}, recent: ${recentExecutions.length})`);

    return NextResponse.json(
      {
        running: runningExecutions,
        recent: recentExecutions,
        stats: {
          running: statusCount['RUNNING'] || 0,
          passed: statusCount['PASSED'] || 0,
          failed: statusCount['FAILED'] || 0,
          pending: statusCount['PENDING'] || 0,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] GET /api/executions/status failed: ${duration}ms`, error);
    return NextResponse.json({ error: '获取执行状态失败' }, { status: 500 });
  }
}
