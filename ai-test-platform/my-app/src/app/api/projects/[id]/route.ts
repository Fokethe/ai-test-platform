/**
 * Project Detail API
 * GET /api/projects/[id] - 获取项目详情
 * PUT /api/projects/[id] - 更新项目
 * DELETE /api/projects/[id] - 删除项目
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取项目详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
        tests: {
          select: { id: true, name: true, type: true, status: true },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
        runs: {
          select: { id: true, name: true, status: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        issues: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true, title: true, severity: true, status: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { tests: true, runs: true, issues: true, systems: true },
        },
      },
    });

    if (!project) {
      return errors.notFound('项目');
    }

    return successResponse({
      ...project,
      testCount: project._count.tests,
      runCount: project._count.runs,
      issueCount: project._count.issues,
      systemCount: project._count.systems,
      _count: undefined,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return errorResponse('获取项目详情失败', 500);
  }
}

// PUT - 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }
    const { name, description, status } = body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('项目');
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update project error:', error);
    return errorResponse('更新失败', 500);
  }
}

// DELETE - 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('项目');
    }

    await prisma.project.delete({ where: { id } });

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete project error:', error);
    return errorResponse('删除失败', 500);
  }
}
