/**
 * Unified Integrations API
 * 取代 Webhook API
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

// GET /api/integrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    const where: any = {};
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';
    
    const total = await prisma.integration.count({ where });
    
    const integrations = await prisma.integration.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });
    
    return listResponse(integrations, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch integrations:', error);
    return errorResponse('获取集成列表失败');
  }
}

// POST /api/integrations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      type,
      provider,
      url,
      secret,
      token,
      events,
      config,
      projectId,
    } = body;
    
    if (!name || !type || !url || !projectId) {
      return errors.badRequest('名称、类型、URL和项目ID不能为空');
    }
    
    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        provider: provider || type,
        url,
        secret,
        token,
        events: typeof events === 'object' ? JSON.stringify(events) : events,
        config: typeof config === 'object' ? JSON.stringify(config) : config,
        projectId,
        createdBy: 'system', // TODO: 从 session 获取
        isActive: true,
      },
    });
    
    return createdResponse(integration);
  } catch (error) {
    console.error('Failed to create integration:', error);
    return errorResponse('创建集成失败');
  }
}
