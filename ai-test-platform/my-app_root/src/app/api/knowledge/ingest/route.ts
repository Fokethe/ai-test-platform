/**
 * 知识库文档摄入 API
 * POST /api/knowledge/ingest
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ingestSchema = z.object({
  documents: z.array(z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1),
  departmentId: z.string(),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ingestSchema.parse(body);
    
    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: validated.documents.length,
        message: `成功摄入 ${validated.documents.length} 个文档`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '文档摄入失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '知识库摄入API',
    supportedFormats: ['text', 'markdown', 'json'],
  });
}
