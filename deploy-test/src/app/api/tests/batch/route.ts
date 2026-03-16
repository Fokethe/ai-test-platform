/**
 * Test Batch Operations API
 * TDD Batch 6C: 批量操作功能
 * 
 * 支持：
 * - 批量删除
 * - 批量更新状态
 * - 批量移动
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 批量操作验证Schema
const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, '至少选择一个测试'),
});

const batchUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, '至少选择一个测试'),
  status: z.enum(['ACTIVE', 'DRAFT', 'DEPRECATED', 'ARCHIVED']),
});

const batchMoveSchema = z.object({
  ids: z.array(z.string()).min(1, '至少选择一个测试'),
  folderId: z.string().optional(),
  suiteId: z.string().optional(),
});

// DELETE - 批量删除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = batchDeleteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: result.error.issues[0].message, data: null },
        { status: 400 }
      );
    }

    const { ids } = result.data;

    // 软删除 - 将状态更新为 ARCHIVED
    const updateResult = await prisma.test.updateMany({
      where: {
        id: { in: ids },
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      code: 0,
      message: `成功删除 ${updateResult.count} 个测试`,
      data: { deleted: updateResult.count },
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { code: 500, message: '批量删除失败', data: null },
      { status: 500 }
    );
  }
}

// PUT - 批量更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = batchUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: result.error.issues[0].message, data: null },
        { status: 400 }
      );
    }

    const { ids, status } = result.data;

    const updateResult = await prisma.test.updateMany({
      where: {
        id: { in: ids },
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      code: 0,
      message: `成功更新 ${updateResult.count} 个测试`,
      data: { updated: updateResult.count },
    });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { code: 500, message: '批量更新失败', data: null },
      { status: 500 }
    );
  }
}

// POST - 批量移动
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = batchMoveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: result.error.issues[0].message, data: null },
        { status: 400 }
      );
    }

    const { ids, folderId, suiteId } = result.data;

    const updateData: any = { updatedAt: new Date() };
    if (folderId) updateData.parentId = folderId;
    if (suiteId) updateData.suiteId = suiteId;

    const updateResult = await prisma.test.updateMany({
      where: {
        id: { in: ids },
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      data: updateData,
    });

    return NextResponse.json({
      code: 0,
      message: `成功移动 ${updateResult.count} 个测试`,
      data: { moved: updateResult.count },
    });
  } catch (error) {
    console.error('Batch move error:', error);
    return NextResponse.json(
      { code: 500, message: '批量移动失败', data: null },
      { status: 500 }
    );
  }
}
