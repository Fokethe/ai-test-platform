import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// POST /api/testcases/batch - 批量操作
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const { action, ids, data } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        errorResponse('请至少选择一项', 1002),
        { status: 400 }
      );
    }

    // 限制批量操作数量
    if (ids.length > 100) {
      return NextResponse.json(
        errorResponse('批量操作最多支持100项', 1002),
        { status: 400 }
      );
    }

    switch (action) {
      case 'delete':
        return handleBatchDelete(ids);
      case 'execute':
        return handleBatchExecute(ids, data, session.user.id);
      case 'update':
        return handleBatchUpdate(ids, data);
      default:
        return NextResponse.json(
          errorResponse('未知的批量操作类型', 1002),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      errorResponse('批量操作失败'),
      { status: 500 }
    );
  }
}

// 批量删除
async function handleBatchDelete(ids: string[]) {
  try {
    // 先检查所有用例是否存在
    const existingCases = await prisma.testCase.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existingCases.length !== ids.length) {
      return NextResponse.json(
        errorResponse('部分测试用例不存在或已被删除', 1004),
        { status: 404 }
      );
    }

    // 删除用例（关联的执行记录会级联删除）
    await prisma.testCase.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json(successResponse({
      deletedCount: ids.length,
    }, `成功删除 ${ids.length} 个测试用例`));
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      errorResponse('批量删除失败'),
      { status: 500 }
    );
  }
}

// 批量执行
async function handleBatchExecute(ids: string[], config: any, userId: string) {
  try {
    // 检查用例是否存在
    const existingCases = await prisma.testCase.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });

    if (existingCases.length !== ids.length) {
      return NextResponse.json(
        errorResponse('部分测试用例不存在', 1004),
        { status: 404 }
      );
    }

    // 创建执行记录
    const executions = await Promise.all(
      ids.map(id =>
        prisma.execution.create({
          data: {
            testCaseId: id,
            status: 'PENDING',
            config: config || { browser: 'chromium', headless: true },
            userId,
          },
        })
      )
    );

    // 异步执行测试（这里简化处理，实际应该调用测试执行服务）
    executions.forEach(async (execution) => {
      await prisma.execution.update({
        where: { id: execution.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });
      
      // 模拟执行完成（实际应该调用Playwright等）
      setTimeout(async () => {
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: Math.random() > 0.3 ? 'PASSED' : 'FAILED',
            completedAt: new Date(),
            duration: Math.floor(Math.random() * 10000),
            logs: '执行完成',
          },
        });
      }, 2000);
    });

    return NextResponse.json(successResponse({
      executionCount: executions.length,
      executionIds: executions.map(e => e.id),
    }, `已开始执行 ${executions.length} 个测试用例`));
  } catch (error) {
    console.error('Batch execute error:', error);
    return NextResponse.json(
      errorResponse('批量执行失败'),
      { status: 500 }
    );
  }
}

// 批量更新
async function handleBatchUpdate(ids: string[], data: any) {
  try {
    // 允许的更新字段
    const allowedFields = ['priority', 'status', 'type'];
    const updateData: any = {};
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        errorResponse('没有可更新的字段', 1002),
        { status: 400 }
      );
    }

    await prisma.testCase.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json(successResponse({
      updatedCount: ids.length,
    }, `成功更新 ${ids.length} 个测试用例`));
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      errorResponse('批量更新失败'),
      { status: 500 }
    );
  }
}
