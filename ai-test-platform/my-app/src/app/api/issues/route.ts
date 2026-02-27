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
import { Prisma } from '@prisma/client';
import { parseJsonBody, buildQueryParams } from '@/lib/api-handler';

// GET /api/issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const assigneeId = searchParams.get('assigneeId');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    
    const where: Prisma.IssueWhereInput = {};
    
    if (projectId) where.projectId = projectId;
    if (type) where.type = type as Prisma.IssueWhereInput['type'];
    if (status) where.status = status as Prisma.IssueWhereInput['status'];
    if (severity) where.severity = severity as Prisma.IssueWhereInput['severity'];
    if (assigneeId) where.assigneeId = assigneeId;
    
    const total = await prisma.issue.count({ where });
    
    const issues = await prisma.issue.findMany({
      where,
      skip,
      take,
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
  const parseResult = await parseJsonBody<{
    title: string;
    description?: string;
    type?: string;
    severity?: string;
    priority?: string;
    projectId: string;
    testId?: string;
    runId?: string;
  }>(request);
  
  if (!parseResult.success) {
    return parseResult.error;
  }
  
  const {
    title,
    description,
    type: issueType = 'BUG',
    severity: issueSeverity = 'MEDIUM',
    priority = 'MEDIUM',
    projectId,
    testId,
    runId,
  } = parseResult.data;
  
  if (!title || !projectId) {
    return errors.badRequest('标题和项目ID不能为空');
  }
  
  try {
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        type: issueType as Prisma.IssueCreateInput['type'],
        severity: issueSeverity as Prisma.IssueCreateInput['severity'],
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
