/**
 * Unified Tests API
 * 合并 TestCase + TestSuite
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

// GET /api/tests - 列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as 'CASE' | 'SUITE' | 'FOLDER' | null;
    const projectId = searchParams.get('projectId');
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    // 构建查询条件
    const where: any = {};
    
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
        mode: 'insensitive',
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
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      type = 'CASE',
      content,
      projectId,
      parentId,
      tags,
      priority = 'MEDIUM',
      source = 'MANUAL',
    } = body;
    
    if (!name || !projectId) {
      return errors.badRequest('名称和项目ID不能为空');
    }
    
    const test = await prisma.test.create({
      data: {
        name,
        description,
        type,
        content: typeof content === 'object' ? JSON.stringify(content) : content,
        projectId,
        parentId,
        tags: typeof tags === 'object' ? JSON.stringify(tags) : tags,
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
