/**
 * Workspace Detail API
 * 工作空间详情管理
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/workspaces/[id] - 获取工作空间详情
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

    // 检查用户是否有权限访问该工作空间
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return Response.json(errorResponse('无权访问该工作空间', 403), { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!workspace) {
      return Response.json(notFoundResponse('工作空间不存在'), { status: 404 });
    }

    return successResponse({
      ...workspace,
      memberCount: workspace.members.length,
    });
  } catch (error) {
    console.error('Failed to fetch workspace:', error);
    return Response.json(errorResponse('获取工作空间详情失败'), { status: 500 });
  }
}

// PUT /api/workspaces/[id] - 更新工作空间
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

    // 检查权限（需要 ADMIN 或 OWNER）
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return Response.json(errorResponse('无权修改该工作空间', 403), { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        name,
        description,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return Response.json(errorResponse('更新工作空间失败'), { status: 500 });
  }
}

// DELETE /api/workspaces/[id] - 删除工作空间
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

    // 检查权限（需要 OWNER）
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!membership) {
      return Response.json(errorResponse('只有所有者可以删除工作空间', 403), { status: 403 });
    }

    await prisma.workspace.delete({ where: { id } });

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return Response.json(errorResponse('删除工作空间失败'), { status: 500 });
  }
}
