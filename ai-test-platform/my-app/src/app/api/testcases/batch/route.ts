/**
 * Test Cases Batch API
 * POST /api/testcases/batch - 批量保存测试用例（用于AI生成）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

interface TestCaseInput {
  name: string;
  description?: string;
  priority?: string;
  steps?: Array<{
    order: number;
    action: string;
    expected?: string;
  }>;
  tags?: string[];
}

// POST - 批量创建测试用例
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }

    const { testCases, projectId }: { 
      testCases: TestCaseInput[]; 
      projectId?: string;
    } = body;

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return errors.badRequest('测试用例列表不能为空');
    }

    // 验证每个用例的基本信息
    for (const tc of testCases) {
      if (!tc.name) {
        return errors.badRequest('测试用例名称不能为空');
      }
    }

    // 批量创建测试用例 - 使用新的 Test 模型
    const createdCases = await prisma.$transaction(
      testCases.map((tc) => {
        const data: any = {
          name: tc.name,
          description: tc.description || '',
          type: 'CASE',
          priority: tc.priority || 'MEDIUM',
          status: 'ACTIVE',
          tags: tc.tags ? JSON.stringify(tc.tags) : null,
          createdBy: session.user.id,
          content: tc.steps ? JSON.stringify({ steps: tc.steps }) : null,
        };
        if (projectId) {
          data.projectId = projectId;
        }
        return prisma.test.create({ data });
      })
    );

    return successResponse(
      { count: createdCases.length, cases: createdCases },
      `成功保存 ${createdCases.length} 个测试用例`
    );
  } catch (error) {
    console.error('Batch create test cases error:', error);
    return errorResponse('批量保存测试用例失败', 500);
  }
}
