/**
 * Workspaces API - 轻量级实现
 * TDD 第2轮：最小实现（绿阶段）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listResponse, createdResponse, errorResponse, errors, buildMeta } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/workspaces - 获取工作空间列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search');

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // 查询用户有权限的工作空间
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      select: { workspaceId: true },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    if (workspaceIds.length > 0) {
      where.id = { in: workspaceIds };
    } else {
      // 如果没有成员关系，返回空结果
      return listResponse([], buildMeta(0, page, pageSize));
    }

    // 查询总数
    const total = await prisma.workspace.count({ where });

    // 查询数据
    const workspaces = await prisma.workspace.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    // 格式化响应
    const formattedWorkspaces = workspaces.map((w) => ({
      ...w,
      projectCount: w._count.projects,
      _count: undefined,
    }));

    return listResponse(formattedWorkspaces, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return Response.json(errorResponse('获取工作空间列表失败'), { status: 500 });
  }
}

// POST /api/workspaces - 创建工作空间
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return errors.badRequest('工作空间名称不能为空');
    }

    // 创建工作空间
    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    const formattedWorkspace = {
      ...workspace,
      projectCount: workspace._count.projects,
      _count: undefined,
    };

    return createdResponse(formattedWorkspace);
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return Response.json(errorResponse('创建工作空间失败'), { status: 500 });
  }
}
