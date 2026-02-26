/**
 * Test Detail API
 * GET /api/tests/[id] - 获取测试详情
 * PUT /api/tests/[id] - 更新测试
 * DELETE /api/tests/[id] - 删除测试
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取测试详情
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

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        },
        parent: {
          select: { id: true, name: true, type: true }
        },
        children: {
          select: { id: true, name: true, type: true, status: true, priority: true }
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            run: {
              select: { id: true, name: true, status: true, createdAt: true }
            }
          }
        },
        issues: {
          where: { status: { not: 'CLOSED' } },
          select: { id: true, title: true, severity: true, status: true }
        }
      }
    });

    if (!test) {
      return Response.json(notFoundResponse('测试不存在'), { status: 404 });
    }

    // 解析 content (JSON steps)
    let steps = [];
    if (test.content) {
      try {
        steps = JSON.parse(test.content);
      } catch {
        steps = [];
      }
    }

    // 解析 tags
    let tags = [];
    if (test.tags) {
      try {
        tags = JSON.parse(test.tags);
      } catch {
        tags = [];
      }
    }

    return Response.json(successResponse({
      ...test,
      steps,
      tags,
      executionCount: await prisma.execution.count({
        where: { testId: id }
      }),
      passCount: await prisma.execution.count({
        where: { testId: id, status: 'PASSED' }
      }),
      failCount: await prisma.execution.count({
        where: { testId: id, status: 'FAILED' }
      })
    }));
  } catch (error) {
    console.error('Get test error:', error);
    return Response.json(errorResponse('获取测试详情失败'), { status: 500 });
  }
}

// PUT - 更新测试
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
    const { name, description, status, priority, tags, steps, parentId } = body;

    // 检查测试是否存在
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(notFoundResponse('测试不存在'), { status: 404 });
    }

    const updated = await prisma.test.update({
      where: { id },
      data: {
        name,
        description,
        status,
        priority,
        parentId,
        tags: tags ? JSON.stringify(tags) : undefined,
        content: steps ? JSON.stringify(steps) : undefined,
      }
    });

    return Response.json(successResponse(updated, '更新成功'));
  } catch (error) {
    console.error('Update test error:', error);
    return Response.json(errorResponse('更新失败'), { status: 500 });
  }
}

// DELETE - 删除测试
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

    // 检查测试是否存在
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(notFoundResponse('测试不存在'), { status: 404 });
    }

    // 软删除：更新状态为 ARCHIVED
    await prisma.test.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });

    return Response.json(successResponse(null, '已删除'));
  } catch (error) {
    console.error('Delete test error:', error);
    return Response.json(errorResponse('删除失败'), { status: 500 });
  }
}
