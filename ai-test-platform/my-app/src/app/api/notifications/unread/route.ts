import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errors } from '@/lib/api-response';
import { fetchUnreadSnapshot } from '../_helpers';

export async function GET(request: NextRequest) {
  void request;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { unreadCount, recentNotifications } = await fetchUnreadSnapshot(session.user.id);
    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        count: unreadCount,
        unreadCount,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    return errors.internalError();
  }
}
