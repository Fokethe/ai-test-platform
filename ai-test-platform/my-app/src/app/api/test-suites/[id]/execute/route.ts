import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runTestCase, RunConfig } from '@/lib/playwright/runner';

// POST /api/test-suites/[id]/execute
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { browser = 'chromium', headless = true }: RunConfig = body;

    const { id } = await params;

    // 获取测试套件及其用例
    const suite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        testSuiteCases: {
          include: { testCase: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!suite) {
      return NextResponse.json({ error: '测试套件不存在' }, { status: 404 });
    }

    if (suite.testSuiteCases.length === 0) {
      return NextResponse.json({ error: '测试套件中没有用例' }, { status: 400 });
    }

    // 创建批量执行记录
    const suiteExecution = await prisma.suiteExecution.create({
      data: {
        name: `${suite.name} - ${new Date().toLocaleString('zh-CN')}`,
        status: 'RUNNING',
        browser,
        headless,
        totalCount: suite.testSuiteCases.length,
        passedCount: 0,
        failedCount: 0,
        testSuiteId: suite.id,
        createdBy: session.user.id || '',
        startedAt: new Date(),
      },
    });

    // 异步执行测试用例
    executeSuite(suiteExecution.id, suite.testSuiteCases, { browser, headless });

    return NextResponse.json({
      success: true,
      executionId: suiteExecution.id,
      message: '测试套件已开始执行',
    });
  } catch (error) {
    console.error('执行测试套件失败:', error);
    return NextResponse.json({ error: '执行测试套件失败' }, { status: 500 });
  }
}

// 异步执行测试套件
async function executeSuite(
  executionId: string,
  testCases: { testCaseId: string }[],
  config: RunConfig
) {
  let passedCount = 0;
  let failedCount = 0;

  try {
    for (const tc of testCases) {
      // 这里简化处理，实际应该创建 TestExecution 记录
      const result = await runTestCase(tc.testCaseId, executionId, config);

      if (result.status === 'passed') {
        passedCount++;
      } else {
        failedCount++;
      }

      // 更新执行进度
      await prisma.suiteExecution.update({
        where: { id: executionId },
        data: {
          passedCount,
          failedCount,
        },
      });
    }

    // 完成执行
    await prisma.suiteExecution.update({
      where: { id: executionId },
      data: {
        status: failedCount > 0 ? 'FAILED' : 'PASSED',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('测试套件执行出错:', error);
    await prisma.suiteExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });
  }
}
