/**
 * TDD Round 7: 用例生成 API
 * POST /api/requirements/[id]/generate-testcases
 * 基于测试点生成详细测试用例
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TestCaseGenerator } from '@/lib/ai/agents/testcase-generator';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 解析请求体
    let body: { testPointIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return errorResponse('无效的请求体', 400);
    }

    const { testPointIds } = body;

    // 验证测试点ID列表
    if (!testPointIds || !Array.isArray(testPointIds) || testPointIds.length === 0) {
      return errorResponse('测试点ID列表不能为空', 400);
    }

    // 查询需求
    const requirement = await prisma.aiRequirement.findUnique({
      where: { id },
      include: {
        testPoints: true,
      },
    });

    if (!requirement) {
      return errorResponse('需求不存在', 404);
    }

    // 验证测试点是否属于该需求
    const validTestPointIds = new Set(requirement.testPoints.map((tp) => tp.id));
    const invalidIds = testPointIds.filter((id) => !validTestPointIds.has(id));

    if (invalidIds.length > 0) {
      return errorResponse('测试点不存在或不属于该需求', 400);
    }

    // 获取要生成的测试点
    const testPointsToGenerate = requirement.testPoints.filter((tp) =>
      testPointIds.includes(tp.id)
    );

    // 解析业务规则和功能点
    let businessRules: any[] = [];
    let features: string[] = [];

    try {
      if (requirement.businessRules) {
        businessRules = JSON.parse(requirement.businessRules as string);
      }
    } catch {
      businessRules = [];
    }

    try {
      if (requirement.features) {
        features = JSON.parse(requirement.features as string);
      }
    } catch {
      features = [];
    }

    // 构建业务规则上下文
    const context = {
      businessRules,
      features,
    };

    // 初始化生成器
    const generator = new TestCaseGenerator();

    // 批量生成用例（逐个传递 context）
    const generatedTestCases: any[] = [];
    for (const tp of testPointsToGenerate) {
      const testCases = await generator.generateFromTestPoint(
        {
          id: tp.id,
          name: tp.name,
          description: tp.description,
          priority: tp.priority as 'P0' | 'P1' | 'P2' | 'P3',
          relatedFeature: tp.relatedFeature,
        },
        context
      );
      generatedTestCases.push(...testCases);
    }

    return successResponse(generatedTestCases);
  } catch (error) {
    console.error('生成用例失败:', error);

    if (error instanceof Error) {
      if (error.message.includes('用例生成失败')) {
        return errorResponse('生成失败: AI 服务不可用', 500);
      }
      if (error.message.includes('解析生成结果失败')) {
        return errorResponse('生成失败: 无法解析 AI 响应', 500);
      }
    }

    return errorResponse('生成失败: 服务器内部错误', 500);
  }
}
