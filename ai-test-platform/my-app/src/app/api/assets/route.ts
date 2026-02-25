/**
 * Unified Assets API
 * 合并 Knowledge + Page
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  listResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';

// GET /api/assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    const where: any = {};
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const total = await prisma.asset.count({ where });
    
    const assets = await prisma.asset.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  try {
    const body = await request.json();
    
    const {
      title,
      description,
      type = 'DOC',
      content,
      selector,
      url,
      tags,
      projectId,
    } = body;
    
    if (!title || !projectId) {
      return errors.badRequest('标题和项目ID不能为空');
    }
    
    const asset = await prisma.asset.create({
      data: {
        title,
        description,
        type,
        content,
        selector,
        url,
        tags: typeof tags === 'object' ? JSON.stringify(tags) : tags,
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
