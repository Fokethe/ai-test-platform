/**
 * 知识库文档摄入 API
 * POST /api/knowledge/ingest
 * 
 * 功能:
 * - 批量添加文档到知识库
 * - 自动分块和向量化
 * - 支持多种文档类型
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRAGService } from '@/lib/ai/rag/rag-service';
import { DocumentProcessor } from '@/lib/ai/rag/document-processor';
import { z } from 'zod';

// 文档验证schema
const documentSchema = z.object({
  id: z.string().min(1, '文档ID不能为空'),
  content: z.string().min(1, '文档内容不能为空'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// 请求验证schema
const ingestSchema = z.object({
  documents: z.array(documentSchema).min(1, '至少需要一个文档').max(100, '一次最多处理100个文档'),
  departmentId: z.string().min(1, '部门ID不能为空'),
  projectId: z.string().optional(),
  chunkOptions: z.object({
    chunkSize: z.number().min(100).max(2000).optional(),
    chunkOverlap: z.number().min(0).max(500).optional(),
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
    const validatedData = ingestSchema.parse(body);

    // 3. 权限检查
    const hasPermission = await checkIngestPermission(
      session.user.id,
      validatedData.departmentId,
      validatedData.projectId
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: '无权限添加文档到该知识库', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // 4. 文档处理 (分块)
    const documentProcessor = new DocumentProcessor();
    const processedDocs: Array<{ id: string; content: string; metadata?: Record<string, unknown> }> = [];

    for (const doc of validatedData.documents) {
      // 如果内容较长，进行分块
      if (doc.content.length > 1000) {
        const result = await documentProcessor.process(doc.content, {
          chunkSize: validatedData.chunkOptions?.chunkSize ?? 500,
          chunkOverlap: validatedData.chunkOptions?.chunkOverlap ?? 50,
        });

        result.chunks.forEach((chunk: string, index: number) => {
          processedDocs.push({
            id: `${doc.id}_chunk_${index}`,
            content: chunk,
            metadata: {
              ...doc.metadata,
              originalDocId: doc.id,
              chunkIndex: index,
              totalChunks: result.chunks.length,
            },
          });
        });
      } else {
        processedDocs.push(doc);
      }
    }

    // 5. 获取RAG服务并摄入文档
    const ragService = getRAGService({
      departmentId: validatedData.departmentId,
      departmentName: validatedData.departmentId,
      projectId: validatedData.projectId,
      projectName: validatedData.projectId,
    });

    await ragService.initialize();
    await ragService.ingest(processedDocs);

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: validatedData.documents.length,
        totalChunks: processedDocs.length,
        departmentId: validatedData.departmentId,
        projectId: validatedData.projectId,
      },
      message: `成功摄入 ${validatedData.documents.length} 个文档，生成 ${processedDocs.length} 个文本块`,
    });

  } catch (error) {
    console.error('文档摄入失败:', error);

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
      { error: '文档摄入失败，请稍后重试', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * 检查文档摄入权限
 */
async function checkIngestPermission(
  userId: string,
  departmentId: string,
  projectId?: string
): Promise<boolean> {
  // 简化实现：实际应检查用户是否为部门管理员或项目成员
  // 这里假设有权限
  return true;
}

/**
 * GET /api/knowledge/ingest
 * 获取摄入配置选项
 */
export async function GET() {
  return NextResponse.json({
    options: {
      chunkSize: { min: 100, max: 2000, default: 500, description: '分块大小（字符数）' },
      chunkOverlap: { min: 0, max: 500, default: 50, description: '分块重叠大小' },
      maxDocuments: { value: 100, description: '单次最大文档数' },
    },
    supportedFormats: [
      '纯文本',
      'Markdown',
      'PDF (需预处理)',
      'Word (需预处理)',
    ],
    processingSteps: [
      '文档接收与验证',
      '文本清洗与标准化',
      '智能分块 (Semantic/Simple)',
      '向量化与索引',
      'BM25索引构建',
    ],
  });
}
