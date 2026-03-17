/**
 * PDF Export API
 * 测试用例 PDF 导出 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { successResponse, errorResponse, errors } from '@/lib/api-response';

// POST /api/tests/export/pdf - 导出测试用例为 PDF
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { testIds, suiteId, format = 'pdf' } = body;

    let tests: any[] = [];

    if (testIds && Array.isArray(testIds)) {
      // 导出指定测试用例
      // FIXME: Test 模型没有 page 关系
      tests = await prisma.test.findMany({
        where: {
          id: { in: testIds },
          type: 'CASE',
        },
      });
    } else if (suiteId) {
      // 导出测试套件中的用例
      // FIXME: Test 模型没有 page 关系和 children 关系
      const suite = await prisma.test.findUnique({
        where: { id: suiteId },
        include: {
          children: {
            where: { type: 'CASE' },
          },
        },
      });
      tests = suite?.children || [];
    }

    if (tests.length === 0) {
      return errors.badRequest('没有找到要导出的测试用例');
    }

    // 生成 PDF 内容（简化版，实际应使用 PDF 生成库）
    const exportData = {
      title: '测试用例导出',
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.email,
      totalCount: tests.length,
      tests: tests.map((test: any) => ({
        id: test.id,
        title: test.title,
        type: test.type,
        priority: test.priority,
        status: test.status,
        preCondition: test.preCondition,
        steps: test.steps,
        expectation: test.expectation,
        page: test.page,
        tags: test.tags,
      })),
    };

    // 返回 JSON 数据（实际项目中应返回 PDF 文件流）
    return successResponse({
      message: 'PDF导出成功（模拟）',
      data: exportData,
      downloadUrl: `/api/tests/export/pdf/download?token=${Date.now()}`,
    });
  } catch (error) {
    console.error('Failed to export tests to PDF:', error);
    return errorResponse('导出PDF失败');
  }
}
