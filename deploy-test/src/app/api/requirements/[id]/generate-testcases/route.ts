/**
 * TDD Round 7: 用例生成 API
 * TDD Round 12: 集成 RAG 知识库
 * TDD Round 15: 集成 ModelManager 支持模型配置
 * POST /api/requirements/[id]/generate-testcases
 * 基于测试点生成详细测试用例
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TestCaseGenerator } from '@/lib/ai/agents/testcase-generator';
import { ModelManager, ModelConfig } from '@/lib/ai/model-manager';
import { successResponse, errorResponse } from '@/lib/api-response';

// 生成请求体类型
interface GenerateRequestBody {
  testPointIds: string[];
  useRAG?: boolean;
  minSimilarity?: number;
  maxResults?: number;
  modelId?: string;
  modelConfig?: Partial<ModelConfig>;
  temperature?: number;
}

// 默认模型配置
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  id: 'kimi-k2.5',
  name: 'Kimi K2.5',
  provider: 'kimi',
  apiKey: process.env.KIMI_API_KEY || '',
  baseUrl: 'https://api.moonshot.cn/v1',
  isActive: true,
  priority: 1,
  costPer1KTokens: { input: 0.001, output: 0.002 },
};

/**
 * 从数据库加载历史用例作为知识库
 * 加载同一项目下的所有活跃测试用例 (Test 模型)
 */
async function loadKnowledgeBase(projectId: string): Promise<any[]> {
  try {
    const historicalCases = await prisma.test.findMany({
      where: {
        projectId,
        status: 'ACTIVE',
        type: 'CASE', // 只加载测试用例，不加载套件
      },
      select: {
        id: true,
        name: true,
        description: true,
        content: true, // JSON 格式存储用例详情
        priority: true,
        tags: true,
      },
      take: 100, // 限制知识库大小
    });

    // 解析 content JSON 字段提取用例详情
    return historicalCases.map(tc => {
      let content = {};
      try {
        if (tc.content) {
          content = JSON.parse(tc.content);
        }
      } catch {
        content = {};
      }

      return {
        id: tc.id,
        title: tc.name,
        description: tc.description,
        precondition: content.precondition || content.preCondition || '',
        steps: content.steps || [],
        expectedResult: content.expectedResult || content.expectation || '',
        priority: tc.priority,
        keywords: extractKeywords(tc.name + ' ' + (tc.description || '')),
      };
    });
  } catch (error) {
    console.error('加载知识库失败:', error);
    return []; // 失败时返回空数组，不影响生成
  }
}

/**
 * 提取关键词（简单实现）
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // 中文分词：提取2-4个字的词组
  const words: string[] = [];
  const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
  
  // 简单的基于词典的提取
  const commonKeywords = ['登录', '注册', '验证', '提交', '查询', '删除', 
    '修改', '添加', '导入', '导出', '审核', '审批', '用户', '管理员',
    '手机号', '验证码', '密码', '邮箱', '身份证', '订单', '支付'];
  
  commonKeywords.forEach(keyword => {
    if (cleanText.includes(keyword)) {
      words.push(keyword);
    }
  });
  
  return words;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 解析请求体
    let body: GenerateRequestBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse('无效的请求体', 400);
    }

    const { testPointIds, useRAG = true, minSimilarity, maxResults } = body;

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

    // TDD Round 15: 创建 ModelManager 实例
    const modelConfig: ModelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...body.modelConfig,
      id: body.modelId || DEFAULT_MODEL_CONFIG.id,
    };

    const modelManager = new ModelManager([modelConfig]);

    // 初始化生成器，传入 ModelManager
    const generator = new TestCaseGenerator(modelManager);

    // 记录模型信息用于响应
    const modelInfo = {
      id: modelConfig.id,
      name: modelConfig.name,
    };
    
    let generatedTestCases: any[] = [];
    let ragInfo: { enabled: boolean; similarCasesCount: number } = { 
      enabled: false, 
      similarCasesCount: 0 
    };

    if (useRAG) {
      // 使用 RAG 增强生成
      try {
        // 加载知识库
        const knowledgeBase = await loadKnowledgeBase(requirement.projectId);
        
        // 准备测试点数据
        const testPoints = testPointsToGenerate.map(tp => ({
          id: tp.id,
          name: tp.name,
          description: tp.description,
          priority: tp.priority as 'P0' | 'P1' | 'P2' | 'P3',
          relatedFeature: tp.relatedFeature,
        }));

        // 使用 RAG 批量生成
        generatedTestCases = await generator.generateFromTestPointsWithRAG(
          testPoints,
          knowledgeBase,
          {
            concurrency: 3,
            minSimilarity: minSimilarity ?? 0.5,
            maxResults: maxResults ?? 3,
          }
        );

        ragInfo = {
          enabled: true,
          similarCasesCount: knowledgeBase.length,
        };
      } catch (ragError) {
        // RAG 失败时回退到普通生成
        console.warn('RAG 生成失败，回退到普通模式:', ragError);
        
        const context = { businessRules, features };
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
        
        ragInfo = {
          enabled: false,
          similarCasesCount: 0,
        };
      }
    } else {
      // 普通生成模式（不使用 RAG）
      const context = { businessRules, features };
      
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
      
      ragInfo = {
        enabled: false,
        similarCasesCount: 0,
      };
    }

    // TDD Round 15: 获取成本统计
    const usageStats = modelManager.getUsageStats();
    const totalCost = modelManager.getTotalCost();

    // 返回结果（包含 RAG 元数据和模型信息）
    return successResponse({
      testCases: generatedTestCases,
      meta: {
        rag: ragInfo,
        generatedCount: generatedTestCases.length,
        testPointCount: testPointsToGenerate.length,
        // TDD Round 15: 添加模型信息
        model: modelInfo,
        cost: {
          estimatedCost: totalCost,
          usageStats,
        },
      },
    });
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
