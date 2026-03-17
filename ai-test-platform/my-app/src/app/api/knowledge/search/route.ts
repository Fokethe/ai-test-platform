/**
 * 知识库搜索 API
 * POST /api/knowledge/search
 * 
 * 功能:
 * - RAG检索增强生成
 * - 支持查询重写、HyDE、Self-RAG
 * - 返回带引用的回答和来源
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RAGService, getRAGService } from '@/lib/ai/rag/rag-service';
import { z } from 'zod';

// 请求验证schema
const searchSchema = z.object({
  query: z.string().min(1, '查询内容不能为空').max(1000, '查询内容过长'),
  departmentId: z.string().min(1, '部门ID不能为空'),
  projectId: z.string().optional(),
  options: z.object({
    topK: z.number().min(1).max(50).optional(),
    enableHyDE: z.boolean().optional(),
    enableQueryRewrite: z.boolean().optional(),
    enableSelfRAG: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. 解析和验证请求
    const body = await request.json();
    const validatedData = searchSchema.parse(body);

    // 3. 权限检查 (检查用户是否有权限访问该部门/项目)
    const hasAccess = await checkDepartmentAccess(
      session.user.id,
      validatedData.departmentId,
      validatedData.projectId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权访问该知识库', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 4. 获取或初始化RAG服务
    const ragService = getRAGService({
      departmentId: validatedData.departmentId,
      departmentName: validatedData.departmentId, // 实际应从数据库获取
      projectId: validatedData.projectId,
      projectName: validatedData.projectId,
      topK: validatedData.options?.topK ?? 10,
      enableHyDE: validatedData.options?.enableHyDE ?? true,
      enableQueryRewrite: validatedData.options?.enableQueryRewrite ?? true,
      enableSelfRAG: validatedData.options?.enableSelfRAG ?? false,
    });

    // 初始化服务
    await ragService.initialize();

    // 5. 执行RAG查询
    const startTime = Date.now();
    const result = await ragService.query(validatedData.query);
    const totalTime = Date.now() - startTime;

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources.map(source => ({
          id: source.id,
          content: source.content.substring(0, 500), // 截断长内容
          score: source.score,
          metadata: source.metadata,
        })),
        citations: result.citations,
        context: {
          query: result.context.query,
          rewrittenQuery: result.context.rewrittenQuery,
          retrievalTime: result.context.retrievalTime,
          totalTime,
          cacheHit: result.context.cacheHit,
        },
        selfRAG: result.selfRAGResult ? {
          reflections: result.selfRAGResult.reflections,
          citations: result.selfRAGResult.citations,
        } : undefined,
      },
    });

  } catch (error) {
    console.error('知识库搜索失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: '请求参数验证失败', 
          code: 'VALIDATION_ERROR',
          details: error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '搜索失败，请稍后重试', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * 检查用户部门访问权限
 */
async function checkDepartmentAccess(
  userId: string,
  departmentId: string,
  projectId?: string
): Promise<boolean> {
  // 简化实现：实际应从数据库检查
  // 这里假设用户有权限
  return true;
}

/**
 * GET /api/knowledge/search
 * 获取搜索配置选项
 */
export async function GET() {
  return NextResponse.json({
    options: {
      topK: { min: 1, max: 50, default: 10, description: '返回结果数量' },
      enableHyDE: { type: 'boolean', default: true, description: '启用HyDE生成' },
      enableQueryRewrite: { type: 'boolean', default: true, description: '启用查询重写' },
      enableSelfRAG: { type: 'boolean', default: false, description: '启用Self-RAG' },
    },
    features: [
      '混合检索 (Dense + BM25)',
      'RRF结果融合',
      'Cross-Encoder重排序',
      'HyDE增强检索',
      '查询重写与扩展',
      '语义缓存',
      '引用生成',
      'Self-RAG事实验证',
    ],
  });
}
