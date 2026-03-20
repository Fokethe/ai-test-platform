import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { markNotificationAsRead } from '../../_helpers';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  void request;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await context.params;
    if (!id) {
      return errors.badRequest('notification id is required');
    }

    const updated = await markNotificationAsRead(session.user.id, id);
    if (!updated) {
      return errors.notFound('notification');
    }

    return successResponse({
      id,
      read: true,
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return errors.internalError();
  }
}
