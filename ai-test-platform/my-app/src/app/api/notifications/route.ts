/**
 * Notifications API
 * 获取通知列表（兼容旧版 Notification 和新版 Inbox）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listResponse, errorResponse, buildMeta } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // 优先查询新版 Inbox 表
    const where: any = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    try {
      // 尝试查询 Inbox（新模型）
      const total = await prisma.inbox.count({ where });

      const notifications = await prisma.inbox.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      // 格式化响应（兼容旧版格式）
      const formattedNotifications = notifications.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        read: n.isRead,
        link: n.linkUrl,
        createdAt: n.createdAt,
      }));

      return listResponse(formattedNotifications, buildMeta(total, page, pageSize));
    } catch (error) {
      // 如果 Inbox 表不存在，返回空数据
      console.error('Inbox query error:', error);
      return listResponse([], buildMeta(0, page, pageSize));
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return Response.json(errorResponse('获取通知列表失败'), { status: 500 });
  }
}

// PUT /api/notifications - 标记所有为已读
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    await prisma.inbox.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return Response.json({
      code: 0,
      message: '标记已读成功',
    });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return Response.json(errorResponse('操作失败'), { status: 500 });
  }
}
