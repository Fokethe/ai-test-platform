/**
 * Workspace Detail API
 * TDD 第2轮：最小实现（绿阶段）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { itemResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-handler';

// GET /api/workspaces/[id] - 获取工作空间详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    // 检查权限
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return errors.forbidden();
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            updatedAt: true,
            _count: {
              select: { systems: true },
            },
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            userId: true,
          },
        },
      },
    });

    if (!workspace) {
      return errors.notFound('工作空间');
    }

    return itemResponse(workspace);
  } catch (error) {
    console.error('Failed to fetch workspace:', error);
    return errorResponse('获取工作空间详情失败', 500);
  }
}

// PUT /api/workspaces/[id] - 更新工作空间
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }
    const { name, description } = body;

    // 检查权限（只有 OWNER 和 ADMIN 可以修改）
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return errors.forbidden();
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    return itemResponse(workspace);
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
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    // 检查权限（只有 OWNER 可以删除）
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!membership) {
      return errors.forbidden();
    }

    // 检查是否有项目（防止误删）
    const projectCount = await prisma.project.count({
      where: { workspaceId: id },
    });

    if (projectCount > 0) {
      return errors.badRequest('工作空间下还有项目，无法删除');
    }

    await prisma.workspace.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return Response.json(errorResponse('删除工作空间失败'), { status: 500 });
  }
}
