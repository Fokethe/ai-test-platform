import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { markAllNotificationsAsRead } from '../_helpers';

export async function POST(request: NextRequest) {
  void request;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const updatedCount = await markAllNotificationsAsRead(session.user.id);
    return successResponse({
      updatedCount,
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return errors.internalError();
  }
}
