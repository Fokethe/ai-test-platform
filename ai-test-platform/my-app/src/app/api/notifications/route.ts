import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildMeta, errors } from '@/lib/api-response';
import {
  clearAllNotifications,
  fetchDashboardNotifications,
  markAllNotificationsAsRead,
} from './_helpers';

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 100);

    const { total, unreadCount, notifications } = await fetchDashboardNotifications(session.user.id, {
      unreadOnly,
      page,
      pageSize,
    });

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        list: notifications,
        pagination: buildMeta(total, page, pageSize),
      },
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return errors.internalError();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-all') {
      const deletedCount = await clearAllNotifications(session.user.id);
      return NextResponse.json({
        code: 0,
        message: 'success',
        data: { deletedCount },
      });
    }

    const updatedCount = await markAllNotificationsAsRead(session.user.id);
    return NextResponse.json({
      code: 0,
      message: 'success',
      data: { updatedCount },
    });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return errors.internalError();
  }
}
