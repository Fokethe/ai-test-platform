/**
 * Issue Detail API
 * GET /api/issues/[id] - 获取问题详情
 * PUT /api/issues/[id] - 更新问题
 * DELETE /api/issues/[id] - 删除问题
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取问题详情
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

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        test: {
          select: { id: true, name: true, type: true },
        },
        run: {
          select: { id: true, name: true, status: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!issue) {
      return errors.notFound('问题');
    }

    return successResponse(issue);
  } catch (error) {
    console.error('Get issue error:', error);
    return errorResponse('获取问题详情失败', 500);
  }
}

// PUT - 更新问题
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
    const {
      title,
      description,
      type,
      severity,
      status,
      priority,
      assigneeId,
      resolution,
    } = body;

    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('问题');
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        title,
        description,
        type,
        severity,
        status,
        priority,
        assigneeId,
        resolution,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : existing.resolvedAt,
        updatedAt: new Date(),
      },
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update issue error:', error);
    return errorResponse('更新失败', 500);
  }
}

// DELETE - 删除问题
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

    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('问题');
    }

    await prisma.issue.delete({ where: { id } });

    return successResponse(null, '已删除');
  } catch (error) {
    console.error('Delete issue error:', error);
    return errorResponse('删除失败', 500);
  }
}
