/**
 * Projects API
 * 项目管理
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listResponse, createdResponse, errorResponse, errors, buildMeta } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';
import { auth } from '@/lib/auth';

// GET /api/projects - 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const where: Prisma.ProjectWhereInput = {};
    
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    
    if (status) {
      where.status = status as Prisma.ProjectWhereInput['status'];
    }
    
    if (search) {
      where.name = {
        contains: search,
      };
    }

    const total = await prisma.project.count({ where });

    const projects = await prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tests: true, runs: true, issues: true },
        },
      },
    });

    const formattedProjects = projects.map(p => ({
      ...p,
      testCount: p._count.tests,
      runCount: p._count.runs,
      issueCount: p._count.issues,
      _count: undefined,
    }));

    return listResponse(formattedProjects, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return errorResponse('获取项目列表失败', 500);
  }
}

// POST /api/projects - 创建项目
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<{
      name: string;
      description?: string;
      workspaceId: string;
    }>(request);
    
    if (!parseResult.success) {
      return parseResult.error;
    }
    
    const { name, description, workspaceId } = parseResult.data;

    if (!name || !workspaceId) {
      return errors.badRequest('项目名称和工作空间ID不能为空');
    }

    // 检查用户是否有权限在该工作空间创建项目
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return errors.forbidden();
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        status: 'ACTIVE',
      },
    });

    return createdResponse(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    return errorResponse('创建项目失败', 500);
  }
}
