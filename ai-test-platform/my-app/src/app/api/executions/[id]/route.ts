import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';

// GET /api/executions/:id - 获取执行详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    // 参数校验
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        errorResponse('执行ID不能为空', 1002),
        { status: 400 }
      );
    }

    console.log(`[API] 获取执行详情: id=${id}, user=${session.user.id}`);

    const execution = await prisma.testExecution.findUnique({
      where: { id: id.trim() },
      include: {
        testCase: {
          include: {
            page: {
              include: {
                system: true,
              },
            },
          },
        },
        run: true,
      },
    });

    if (!execution) {
      console.log(`[API] 执行记录不存在: id=${id}`);
      return NextResponse.json(notFoundResponse('执行记录'), { status: 404 });
    }

    console.log(`[API] 成功获取执行详情: id=${id}`);
    return NextResponse.json(successResponse(execution));
  } catch (error) {
    console.error('[API] 获取执行详情错误:', error);
    const errorMessage = error instanceof Error ? error.message : '获取执行详情失败';
    return NextResponse.json(
      errorResponse(`获取执行详情失败: ${errorMessage}`, 1000),
      { status: 500 }
    );
  }
}

// PUT /api/executions/:id - 更新执行记录（用于更新执行状态）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    
    // 参数校验
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('[API] 更新执行记录失败: 执行ID为空');
      return NextResponse.json(
        errorResponse('执行ID不能为空', 1002),
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API] 更新执行记录失败: 请求体解析错误', parseError);
      return NextResponse.json(
        errorResponse('请求体格式错误', 1002),
        { status: 400 }
      );
    }
    
    console.log(`[API] 更新执行记录: id=${id}, data=`, body);

    // 验证允许的字段
    const allowedFields = ['status', 'errorMessage', 'duration', 'logs', 'screenshots', 'completedAt'];
    const invalidFields = Object.keys(body).filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      console.warn(`[API] 更新执行记录: 忽略无效字段: ${invalidFields.join(', ')}`);
    }

    // 过滤只保留允许的字段
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // 检查执行记录是否存在
    const existingExecution = await prisma.testExecution.findUnique({
      where: { id: id.trim() },
    });

    if (!existingExecution) {
      console.error(`[API] 更新执行记录失败: 执行记录不存在, id=${id}`);
      return NextResponse.json(notFoundResponse('执行记录'), { status: 404 });
    }

    console.log(`[API] 找到执行记录，当前状态: ${existingExecution.status}`);

    // 执行更新
    const execution = await prisma.testExecution.update({
      where: { id: id.trim() },
      data: updateData,
    });

    console.log(`[API] 成功更新执行记录: id=${id}, 新状态: ${execution.status}`);
    return NextResponse.json(successResponse(execution, '更新成功'));
  } catch (error) {
    console.error('[API] 更新执行记录错误:', error);
    const errorMessage = error instanceof Error ? error.message : '更新执行记录失败';
    return NextResponse.json(
      errorResponse(`更新执行记录失败: ${errorMessage}`, 1000),
      { status: 500 }
    );
  }
}

// DELETE /api/executions/:id - 删除执行记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    
    // 参数校验
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        errorResponse('执行ID不能为空', 1002),
        { status: 400 }
      );
    }

    console.log(`[API] 删除执行记录: id=${id}`);

    // 检查执行记录是否存在
    const existingExecution = await prisma.testExecution.findUnique({
      where: { id: id.trim() },
    });

    if (!existingExecution) {
      return NextResponse.json(notFoundResponse('执行记录'), { status: 404 });
    }

    await prisma.testExecution.delete({ where: { id: id.trim() } });

    console.log(`[API] 成功删除执行记录: id=${id}`);
    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('[API] 删除执行记录错误:', error);
    const errorMessage = error instanceof Error ? error.message : '删除执行记录失败';
    return NextResponse.json(
      errorResponse(`删除执行记录失败: ${errorMessage}`, 1000),
      { status: 500 }
    );
  }
}
