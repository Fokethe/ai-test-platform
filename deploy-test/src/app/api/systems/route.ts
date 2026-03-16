/**
 * Systems API
 * 系统管理（被测系统）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listResponse, itemResponse, createdResponse, errorResponse, errors, buildMeta } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/systems - 获取系统列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }

    const total = await prisma.system.count({ where });

    const systems = await prisma.system.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { pages: true },
        },
      },
    });

    const formattedSystems = systems.map(s => ({
      ...s,
      pageCount: s._count.pages,
      _count: undefined,
    }));

    return listResponse(formattedSystems, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch systems:', error);
    return Response.json(errorResponse('获取系统列表失败'), { status: 500 });
  }
}

// POST /api/systems - 创建系统
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const body = await request.json();
    const { name, baseUrl, projectId } = body;

    if (!name || !baseUrl || !projectId) {
      return errors.badRequest('名称、URL 和项目 ID 不能为空');
    }

    const system = await prisma.system.create({
      data: {
        name,
        baseUrl,
        projectId,
      },
    });

    return createdResponse(system);
  } catch (error) {
    console.error('Failed to create system:', error);
    return Response.json(errorResponse('创建系统失败'), { status: 500 });
  }
}
