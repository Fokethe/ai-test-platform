/**
 * Pages API
 * 页面管理 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { successResponse, createdResponse, errorResponse, errors } from '@/lib/api-response';

// GET /api/pages - 获取页面列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');
    const search = searchParams.get('search');

    const where: any = {};
    if (systemId) where.systemId = systemId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { path: { contains: search } },
      ];
    }

    const pages = await prisma.page.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        system: {
          select: { id: true, name: true },
        },
      },
    });

    return successResponse(pages);
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return errorResponse('获取页面列表失败');
  }
}

// POST /api/pages - 创建页面
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { name, path, systemId, description, selector } = body;

    if (!name || !path || !systemId) {
      return errors.badRequest('缺少必要参数');
    }

    const page = await prisma.page.create({
      data: {
        name,
        path,
        systemId,
      },
    });

    return createdResponse(page);
  } catch (error) {
    console.error('Failed to create page:', error);
    return errorResponse('创建页面失败');
  }
}

// PUT /api/pages - 批量更新页面
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { ids, data } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errors.badRequest('缺少页面ID列表');
    }

    const result = await prisma.page.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return successResponse({ updated: result.count });
  } catch (error) {
    console.error('Failed to update pages:', error);
    return errorResponse('更新页面失败');
  }
}

// DELETE /api/pages - 删除页面
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errors.badRequest('缺少页面ID');
    }

    await prisma.page.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Failed to delete page:', error);
    return errorResponse('删除页面失败');
  }
}
