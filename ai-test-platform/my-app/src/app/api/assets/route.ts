/**
 * Unified Assets API
 * 合并 Knowledge + Page
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  listResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';
import { auth } from '@/lib/auth';

// 输入验证 schema
const createAssetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['DOC', 'PAGE', 'SNIPPET', 'IMAGE']).default('DOC'),
  content: z.string().max(50000).optional(),
  selector: z.string().max(500).optional(),
  url: z.string().url().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().uuid().optional(),
});

// GET /api/assets
export async function GET(request: NextRequest) {
  // 认证检查
  const session = await auth();
  if (!session?.user) {
    return errors.unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    const where: Prisma.AssetWhereInput = {
      status: { not: 'ARCHIVED' }, // 过滤掉已删除的资产
    };
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type as Prisma.AssetWhereInput['type'];
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    
    // 使用 Promise.all 并行执行查询
    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        // 只选择需要的字段，减少数据传输
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          url: true,
          selector: true,
          tags: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
    
    // 添加缓存头
    const response = listResponse(assets, buildMeta(total, page, pageSize));
    response.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return errorResponse('获取资产列表失败');
  }
}

// POST /api/assets
export async function POST(request: NextRequest) {
  // 认证检查
  const session = await auth();
  if (!session?.user) {
    return errors.unauthorized();
  }

  const parseResult = await parseJsonBody<{
    title: string;
    description?: string;
    type?: string;
    content?: string;
    selector?: string;
    url?: string;
    tags?: unknown;
    projectId: string;
  }>(request);
  
  if (!parseResult.success) {
    return parseResult.error;
  }
  
  const {
    title,
    description,
    type: assetType = 'DOC',
    content,
    selector,
    url,
    tags,
    projectId,
  } = parseResult.data;
  
  // Zod 验证
  const validationResult = createAssetSchema.safeParse(parseResult.data);
  if (!validationResult.success) {
    return errors.validationError(validationResult.error.flatten().fieldErrors);
  }
  
  const validatedData = validationResult.data;
  
  try {
    const asset = await prisma.asset.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type as Prisma.AssetCreateInput['type'],
        content: validatedData.content ?? null,
        selector: validatedData.selector ?? null,
        url: validatedData.url ?? null,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        projectId: validatedData.projectId,
        createdBy: session.user.id,
      },
    });
    
    return createdResponse(asset);
  } catch (error) {
    console.error('Failed to create asset:', error);
    return errorResponse('创建资产失败');
  }
}
