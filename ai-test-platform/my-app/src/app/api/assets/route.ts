/**
 * Unified Assets API
 * 合并 Knowledge + Page
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  listResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';

// GET /api/assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    const where: Prisma.AssetWhereInput = {};
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type as Prisma.AssetWhereInput['type'];
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    
    const total = await prisma.asset.count({ where });
    
    const assets = await prisma.asset.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
    });
    
    return listResponse(assets, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return errorResponse('获取资产列表失败');
  }
}

// POST /api/assets
export async function POST(request: NextRequest) {
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
  
  if (!title || !projectId) {
    return errors.badRequest('标题和项目ID不能为空');
  }
  
  try {
    const asset = await prisma.asset.create({
      data: {
        title,
        description,
        type: assetType as Prisma.AssetCreateInput['type'],
        content: content ?? null,
        selector: selector ?? null,
        url: url ?? null,
        tags: tags ? (typeof tags === 'object' ? JSON.stringify(tags) : String(tags)) : null,
        projectId,
        createdBy: 'system', // TODO: 从 session 获取
      },
    });
    
    return createdResponse(asset);
  } catch (error) {
    console.error('Failed to create asset:', error);
    return errorResponse('创建资产失败');
  }
}
