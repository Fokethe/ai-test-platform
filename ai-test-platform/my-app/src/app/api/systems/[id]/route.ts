/**
 * System Detail API
 * GET /api/systems/[id] - 获取系统详情
 * PUT /api/systems/[id] - 更新系统
 * DELETE /api/systems/[id] - 删除系统
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取系统详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const system = await prisma.system.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        pages: {
          select: { id: true, name: true, path: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!system) {
      return Response.json(notFoundResponse('系统不存在'), { status: 404 });
    }

    return successResponse(system);
  } catch (error) {
    console.error('Get system error:', error);
    return Response.json(errorResponse('获取系统详情失败'), { status: 500 });
  }
}

// PUT - 更新系统
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const body = await request.json();
    const { name, baseUrl } = body;

    const existing = await prisma.system.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(notFoundResponse('系统不存在'), { status: 404 });
    }

    const updated = await prisma.system.update({
      where: { id },
      data: {
        name,
        baseUrl,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update system error:', error);
    return Response.json(errorResponse('更新失败'), { status: 500 });
  }
}

// DELETE - 删除系统
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const existing = await prisma.system.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(notFoundResponse('系统不存在'), { status: 404 });
    }

    await prisma.system.delete({ where: { id } });

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete system error:', error);
    return Response.json(errorResponse('删除失败'), { status: 500 });
  }
}
