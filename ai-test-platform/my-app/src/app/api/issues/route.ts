/**
 * Unified Issues API
 * 取代 Bug API
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  listResponse,
  createdResponse,
  errorResponse,
  errors,
  buildMeta,
} from '@/lib/api-response';

// GET /api/issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const assigneeId = searchParams.get('assigneeId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    const where: any = {};
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (assigneeId) where.assigneeId = assigneeId;
    
    const total = await prisma.issue.count({ where });
    
    const issues = await prisma.issue.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        test: {
          select: { id: true, name: true },
        },
      },
    });
    
    return listResponse(issues, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return errorResponse('获取问题列表失败');
  }
}

// POST /api/issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      title,
      description,
      type = 'BUG',
      severity = 'MEDIUM',
      priority = 'MEDIUM',
      projectId,
      testId,
      runId,
    } = body;
    
    if (!title || !projectId) {
      return errors.badRequest('标题和项目ID不能为空');
    }
    
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        type,
        severity,
        priority,
        projectId,
        testId,
        runId,
        reporterId: 'system', // TODO: 从 session 获取
        status: 'OPEN',
      },
    });
    
    return createdResponse(issue);
  } catch (error) {
    console.error('Failed to create issue:', error);
    return errorResponse('创建问题失败');
  }
}
