import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/notifications/unread - 获取未读消息数量
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const [unreadCount, recentNotifications] = await Promise.all([
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id, read: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json(successResponse({
      unreadCount,
      recentNotifications,
    }));
  } catch (error) {
    console.error('Get unread notifications error:', error);
    return NextResponse.json(errorResponse('获取未读消息失败'), { status: 500 });
  }
}
