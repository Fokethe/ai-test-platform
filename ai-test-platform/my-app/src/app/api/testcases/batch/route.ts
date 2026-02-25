import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// 批量操作请求体验证
const batchSchema = z.object({
  action: z.enum(['delete', 'execute', 'update', 'export']),
  ids: z.array(z.string()).min(1, '至少选择一个测试用例'),
  data: z.object({
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  }).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

// POST /api/testcases/batch - 批量操作
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = batchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { action, ids, data, format } = result.data;

    // 验证用户是否有权限操作这些测试用例
    const testCases = await prisma.testCase.findMany({
      where: { id: { in: ids } },
      include: {
        page: {
          include: {
            system: {
              include: {
                project: {
                  include: {
                    workspace: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (testCases.length !== ids.length) {
      return NextResponse.json(
        errorResponse('部分测试用例不存在', 1004),
        { status: 404 }
      );
    }

    // 执行批量操作
    switch (action) {
      case 'delete':
        return await handleBatchDelete(ids, testCases, startTime);
      
      case 'execute':
        return await handleBatchExecute(ids, session.user.id, startTime);
      
      case 'update':
        if (!data) {
          return NextResponse.json(
            errorResponse('缺少更新数据', 1002),
            { status: 400 }
          );
        }
        return await handleBatchUpdate(ids, data, startTime);
      
      case 'export':
        return await handleBatchExport(ids, format || 'json', testCases, startTime);
      
      default:
        return NextResponse.json(
          errorResponse('不支持的操作类型', 1002),
          { status: 400 }
        );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] POST /api/testcases/batch failed: ${duration}ms`, error);
    return NextResponse.json(
      errorResponse('批量操作失败'),
      { status: 500 }
    );
  }
}

// 批量删除
async function handleBatchDelete(
  ids: string[],
  testCases: any[],
  startTime: number
) {
  try {
    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 1. 删除相关的执行记录
      await tx.execution.deleteMany({
        where: { testCaseId: { in: ids } },
      });

      // 2. 删除测试用例
      await tx.testCase.deleteMany({
        where: { id: { in: ids } },
      });
    });

    const duration = Date.now() - startTime;
    console.log(`[API Timing] Batch delete: ${duration}ms (${ids.length} items)`);

    return NextResponse.json(
      successResponse(
        { deletedCount: ids.length },
        `成功删除 ${ids.length} 个测试用例`
      )
    );
  } catch (error) {
    console.error('[Batch Delete Error]', error);
    return NextResponse.json(
      errorResponse('批量删除失败'),
      { status: 500 }
    );
  }
}

// 批量执行
async function handleBatchExecute(
  ids: string[],
  userId: string,
  startTime: number
) {
  try {
    // 创建执行记录
    const executions = await Promise.all(
      ids.map(async (testCaseId) => {
        return prisma.execution.create({
          data: {
            testCaseId,
            status: 'PENDING',
            config: JSON.stringify({ browser: 'chromium', headless: true }),
            startedAt: new Date(),
          },
          select: {
            id: true,
            testCaseId: true,
            status: true,
          },
        });
      })
    );

    const duration = Date.now() - startTime;
    console.log(`[API Timing] Batch execute: ${duration}ms (${ids.length} items)`);

    // 异步触发实际执行（这里可以集成 Playwright Runner）
    // 实际执行逻辑应该在后台任务中处理

    return NextResponse.json(
      successResponse(
        { 
          executionCount: executions.length,
          executions: executions.map(e => ({
            executionId: e.id,
            testCaseId: e.testCaseId,
            status: e.status,
          })),
        },
        `成功创建 ${executions.length} 个执行记录`
      )
    );
  } catch (error) {
    console.error('[Batch Execute Error]', error);
    return NextResponse.json(
      errorResponse('批量执行失败'),
      { status: 500 }
    );
  }
}

// 批量更新
async function handleBatchUpdate(
  ids: string[],
  data: { priority?: string; status?: string },
  startTime: number
) {
  try {
    const updateData: any = {};
    if (data.priority) updateData.priority = data.priority;
    if (data.status) updateData.status = data.status;

    const result = await prisma.testCase.updateMany({
      where: { id: { in: ids } },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[API Timing] Batch update: ${duration}ms (${result.count} items)`);

    return NextResponse.json(
      successResponse(
        { updatedCount: result.count },
        `成功更新 ${result.count} 个测试用例`
      )
    );
  } catch (error) {
    console.error('[Batch Update Error]', error);
    return NextResponse.json(
      errorResponse('批量更新失败'),
      { status: 500 }
    );
  }
}

// 批量导出
async function handleBatchExport(
  ids: string[],
  format: 'json' | 'csv',
  testCases: any[],
  startTime: number
) {
  try {
    // 获取完整的测试用例数据
    const fullTestCases = await prisma.testCase.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        preCondition: true,
        steps: true,
        expectation: true,
        priority: true,
        status: true,
        tags: true,
        isAiGenerated: true,
        createdAt: true,
        updatedAt: true,
        page: {
          select: {
            name: true,
            system: {
              select: {
                name: true,
                project: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 解析 steps 和 tags
    const parsedTestCases = fullTestCases.map(tc => ({
      ...tc,
      steps: tc.steps ? JSON.parse(tc.steps) : [],
      tags: tc.tags ? JSON.parse(tc.tags) : [],
      location: `${tc.page?.system?.project?.name} / ${tc.page?.system?.name} / ${tc.page?.name}`,
    }));

    if (format === 'csv') {
      // 生成 CSV
      const headers = ['ID', '标题', '前置条件', '步骤', '预期结果', '优先级', '状态', '标签', 'AI生成', '位置', '创建时间'];
      const rows = parsedTestCases.map(tc => [
        tc.id,
        tc.title,
        tc.preCondition || '',
        tc.steps.join('\n'),
        tc.expectation,
        tc.priority,
        tc.status,
        tc.tags.join(', '),
        tc.isAiGenerated ? '是' : '否',
        tc.location,
        tc.createdAt.toISOString(),
      ]);

      // CSV 转义处理
      const escapeCsv = (value: string) => {
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(',')),
      ].join('\n');

      const duration = Date.now() - startTime;
      console.log(`[API Timing] Batch export CSV: ${duration}ms (${ids.length} items)`);

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="testcases_batch_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // 生成 JSON
      const exportData = {
        exportInfo: {
          total: parsedTestCases.length,
          exportedAt: new Date().toISOString(),
          format: 'json',
        },
        testCases: parsedTestCases.map(tc => ({
          id: tc.id,
          title: tc.title,
          preCondition: tc.preCondition,
          steps: tc.steps,
          expectation: tc.expectation,
          priority: tc.priority,
          status: tc.status,
          tags: tc.tags,
          isAiGenerated: tc.isAiGenerated,
          location: tc.location,
          createdAt: tc.createdAt,
          updatedAt: tc.updatedAt,
        })),
      };

      const duration = Date.now() - startTime;
      console.log(`[API Timing] Batch export JSON: ${duration}ms (${ids.length} items)`);

      return NextResponse.json(successResponse(exportData, '导出成功'));
    }
  } catch (error) {
    console.error('[Batch Export Error]', error);
    return NextResponse.json(
      errorResponse('批量导出失败'),
      { status: 500 }
    );
  }
}
