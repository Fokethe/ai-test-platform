import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// PUT /api/notifications/[id] - 标记单条消息为已读
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    // 验证消息是否属于当前用户
    const notification = await prisma.notification.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!notification) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(successResponse(updated, '已标记为已读'));
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(errorResponse('操作失败'), { status: 500 });
  }
}

// DELETE /api/notifications/[id] - 删除单条消息
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    // 验证消息是否属于当前用户
    const notification = await prisma.notification.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!notification) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json(successResponse(null, '消息已删除'));
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(errorResponse('删除失败'), { status: 500 });
  }
}
