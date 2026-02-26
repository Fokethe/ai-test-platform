/**
 * POST /api/requirements/upload
 * 需求文档上传 API
 * 
 * 功能：
 * 1. 接收文件上传（multipart/form-data）
 * 2. 解析文档内容
 * 3. 提取功能点和测试点
 * 4. 存储到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentParser } from '@/lib/ai/agents/document-parser';
import { RequirementParser } from '@/lib/ai/agents/requirement-parser';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { success: false, error: '缺少文件' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '缺少 projectId' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 验证文件内容不为空
    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: '文件内容为空' },
        { status: 400 }
      );
    }

    // 解析文档
    const documentParser = new DocumentParser();
    let parsedDoc;
    try {
      parsedDoc = await documentParser.parse(buffer, file.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : '文档解析失败';
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    // 提取测试点
    const requirementParser = new RequirementParser();
    const parsedRequirement = await requirementParser.parse(parsedDoc.content);

    // 生成唯一ID
    const id = randomUUID();

    // 构建响应数据
    const result = {
      id,
      title: parsedDoc.title,
      type: parsedDoc.type,
      filename: parsedDoc.filename,
      content: parsedDoc.content,
      rawText: parsedDoc.rawText,
      size: parsedDoc.size,
      features: parsedRequirement.features,
      businessRules: parsedRequirement.businessRules,
      testPoints: parsedRequirement.testPoints,
      projectId,
      createdAt: new Date().toISOString(),
    };

    // TODO: 存储到数据库（暂时跳过，后续实现）
    // await prisma.requirement.create({ data: result });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: '上传处理失败' },
      { status: 500 }
    );
  }
}
