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
import { z } from 'zod';

// Project 创建验证 Schema
const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100, '项目名称最多100个字符'),
  description: z.string().max(500, '项目描述最多500个字符').optional(),
  workspaceId: z.string().min(1, '工作空间ID不能为空'),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
});

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

    const parseResult = await parseJsonBody<unknown>(request);
    
    if (!parseResult.success) {
      return parseResult.error;
    }

    // Zod 验证
    const validationResult = createProjectSchema.safeParse(parseResult.data);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      return errors.badRequest(`输入验证失败: ${errorMessages}`);
    }
    
    const { name, description, workspaceId } = validationResult.data;

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
        status: validationResult.data.status || 'ACTIVE',
      },
    });

    return createdResponse(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    return errorResponse('创建项目失败', 500);
  }
}
