/**
 * Unified Tests API
 * 合并 TestCase + TestSuite
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

// GET /api/tests - 列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as 'CASE' | 'SUITE' | 'FOLDER' | null;
    const projectId = searchParams.get('projectId');
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    // 构建查询条件
    const where: Prisma.TestWhereInput = {};
    
    if (type) {
      where.type = type;
    }
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }
    
    if (search) {
      where.name = {
        contains: search,
      };
    }
    
    if (tags) {
      // JSON 数组搜索
      where.tags = {
        contains: tags,
      };
    }
    
    // 查询总数
    const total = await prisma.test.count({ where });
    
    // 查询数据
    const tests = await prisma.test.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        children: {
          select: { id: true },
        },
        _count: {
          select: { executions: true },
        },
      },
    });
    
    return listResponse(tests, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch tests:', error);
    return errorResponse('获取测试列表失败');
  }
}

// POST /api/tests - 创建
export async function POST(request: NextRequest) {
  const parseResult = await parseJsonBody<{
    name: string;
    description?: string;
    type?: string;
    content?: unknown;
    projectId: string;
    parentId?: string | null;
    tags?: unknown;
    priority?: string;
    source?: string;
  }>(request);
  
  if (!parseResult.success) {
    return parseResult.error;
  }
  
  const {
    name,
    description,
    type: testType = 'CASE',
    content,
    projectId,
    parentId,
    tags,
    priority = 'MEDIUM',
    source = 'MANUAL',
  } = parseResult.data;
  
  if (!name || !projectId) {
    return errors.badRequest('名称和项目ID不能为空');
  }
  
  try {
    const test = await prisma.test.create({
      data: {
        name,
        description,
        type: testType as Prisma.TestCreateInput['type'],
        content: content ? (typeof content === 'object' ? JSON.stringify(content) : String(content)) : null,
        projectId,
        parentId,
        tags: tags ? (typeof tags === 'object' ? JSON.stringify(tags) : String(tags)) : null,
        priority,
        source,
        createdBy: 'system', // TODO: 从 session 获取
      },
    });
    
    return createdResponse(test);
  } catch (error) {
    console.error('Failed to create test:', error);
    return errorResponse('创建测试失败');
  }
}
