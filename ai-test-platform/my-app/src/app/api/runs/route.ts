/**
 * Unified Runs API
 * 合并 TestRun + Executions
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  listResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';

// GET /api/runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    const where: Prisma.RunWhereInput = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (status) {
      where.status = status as Prisma.RunWhereInput['status'];
    }
    
    if (type) {
      where.type = type as Prisma.RunWhereInput['type'];
    }
    
    const total = await prisma.run.count({ where });
    
    const runs = await prisma.run.findMany({
      where,
      skip,
      take,
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
  const parseResult = await parseJsonBody<{
    name: string;
    description?: string;
    type?: string;
    projectId?: string;
    testIds: string[];
  }>(request);
  
  if (!parseResult.success) {
    return parseResult.error;
  }
  
  const {
    name,
    description,
    type: runType = 'MANUAL',
    projectId,
    testIds,
  } = parseResult.data;
  
  if (!name || !testIds || !Array.isArray(testIds)) {
    return errors.badRequest('名称和测试ID列表不能为空');
  }
  
  try {
    const run = await prisma.run.create({
      data: {
        name,
        description,
        type: runType as Prisma.RunCreateInput['type'],
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
