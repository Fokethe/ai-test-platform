/**
 * Notifications Unread Count API
 * 获取未读通知数量
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET /api/notifications/unread
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(errorResponse('未授权', 401), { status: 401 });
    }

    try {
      const count = await prisma.inbox.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      });

      return Response.json({
        code: 0,
        message: 'success',
        data: { count },
      });
    } catch (error) {
      // 如果表不存在，返回 0
      return Response.json({
        code: 0,
        message: 'success',
        data: { count: 0 },
      });
    }
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return Response.json(errorResponse('获取未读数量失败'), { status: 500 });
  }
}
