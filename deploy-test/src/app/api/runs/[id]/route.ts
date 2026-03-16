/**
 * Run Detail API
 * GET /api/runs/[id] - 获取执行详情
 * PUT /api/runs/[id] - 更新执行
 * DELETE /api/runs/[id] - 删除执行
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取执行详情
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

    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        },
        executions: {
          orderBy: { createdAt: 'asc' },
          include: {
            test: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        issues: {
          select: { id: true, title: true, severity: true, status: true }
        }
      }
    });

    if (!run) {
      return errors.notFound('执行');
    }

    // 计算统计
    const executions = run.executions || [];
    const stats = {
      total: executions.length,
      passed: executions.filter(e => e.status === 'PASSED').length,
      failed: executions.filter(e => e.status === 'FAILED').length,
      skipped: executions.filter(e => e.status === 'SKIPPED').length,
      running: executions.filter(e => e.status === 'RUNNING').length,
      pending: executions.filter(e => e.status === 'PENDING').length,
    };

    return successResponse({
      ...run,
      stats,
      passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
    });
  } catch (error) {
    console.error('Get run error:', error);
    return errorResponse('获取执行详情失败', 500);
  }
}

// PUT - 更新执行（主要用于取消）
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

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }
    const { status, name } = body;

    const existing = await prisma.run.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('执行');
    }

    const updated = await prisma.run.update({
      where: { id },
      data: {
        status,
        name,
        ...(status === 'CANCELLED' ? { completedAt: new Date() } : {})
      }
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update run error:', error);
    return errorResponse('更新失败', 500);
  }
}

// DELETE - 删除执行
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

    const existing = await prisma.run.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('执行');
    }

    await prisma.run.delete({ where: { id } });

    return successResponse(null, '已删除');
  } catch (error) {
    console.error('Delete run error:', error);
    return errorResponse('删除失败', 500);
  }
}
