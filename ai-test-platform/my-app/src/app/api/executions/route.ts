import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/executions - 获取执行记录列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = pageId ? { 
      testCase: { pageId } 
    } : {};

    const executions = await prisma.testExecution.findMany({
      where,
      include: {
        testCase: {
          select: {
            title: true,
            page: {
              select: {
                name: true,
                system: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(successResponse({ list: executions }));
  } catch (error) {
    console.error('Get executions error:', error);
    return NextResponse.json(
      errorResponse('获取执行记录失败'),
      { status: 500 }
    );
  }
}

// POST /api/executions - 创建执行记录（运行测试）
const createSchema = z.object({
  testCaseId: z.string(),
  config: z.object({
    browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    headless: z.boolean().default(true),
    timeout: z.number().default(30000),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { testCaseId, config } = result.data;

    // 创建 TestRun
    const testRun = await prisma.testRun.create({
      data: {
        name: `执行-${new Date().toLocaleString('zh-CN')}`,
        status: 'RUNNING',
        browser: config?.browser || 'chromium',
        headless: config?.headless ?? true,
        totalCount: 1,
        createdBy: session.user.id,
      },
    });

    // 创建 TestExecution
    const execution = await prisma.testExecution.create({
      data: {
        testCaseId,
        runId: testRun.id,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // 异步执行测试（实际应该在后台任务中执行）
    // 这里简化处理，直接返回执行记录ID
    // 真实场景应该使用队列系统

    return NextResponse.json(successResponse({
      executionId: execution.id,
      runId: testRun.id,
      message: '测试已开始执行',
    }));
  } catch (error) {
    console.error('Create execution error:', error);
    return NextResponse.json(
      errorResponse('创建执行记录失败'),
      { status: 500 }
    );
  }
}
