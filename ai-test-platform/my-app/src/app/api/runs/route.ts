/**
 * Unified Runs API
 * 合并 TestRun + Executions
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  listResponse,
  itemResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';

// GET /api/runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    const total = await prisma.run.count({ where });
    
    const runs = await prisma.run.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          select: {
            id: true,
            status: true,
            testId: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });
    
    return listResponse(runs, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    return errorResponse('获取执行列表失败');
  }
}

// POST /api/runs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      type = 'MANUAL',
      projectId,
      testIds,
    } = body;
    
    if (!name || !testIds || !Array.isArray(testIds)) {
      return errors.badRequest('名称和测试ID列表不能为空');
    }
    
    const run = await prisma.run.create({
      data: {
        name,
        description,
        type,
        projectId,
        totalCount: testIds.length,
        status: 'PENDING',
        executions: {
          create: testIds.map((testId: string) => ({
            testId,
            status: 'PENDING',
          })),
        },
      },
      include: {
        executions: true,
      },
    });
    
    return createdResponse(run);
  } catch (error) {
    console.error('Failed to create run:', error);
    return errorResponse('创建执行失败');
  }
}
