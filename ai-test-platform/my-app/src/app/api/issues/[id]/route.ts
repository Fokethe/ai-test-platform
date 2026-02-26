/**
 * Issue Detail API
 * GET /api/issues/[id] - 获取问题详情
 * PUT /api/issues/[id] - 更新问题
 * DELETE /api/issues/[id] - 删除问题
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
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
      return Response.json(errorResponse('未授权', 401), { status: 401 });
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
      return Response.json(notFoundResponse('问题不存在'), { status: 404 });
    }

    return successResponse(issue);
  } catch (error) {
    console.error('Get issue error:', error);
    return Response.json(errorResponse('获取问题详情失败'), { status: 500 });
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
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const body = await request.json();
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
      return Response.json(notFoundResponse('问题不存在'), { status: 404 });
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
    return Response.json(errorResponse('更新失败'), { status: 500 });
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
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(notFoundResponse('问题不存在'), { status: 404 });
    }

    await prisma.issue.delete({ where: { id } });

    return successResponse(null, '已删除');
  } catch (error) {
    console.error('Delete issue error:', error);
    return Response.json(errorResponse('删除失败'), { status: 500 });
  }
}
