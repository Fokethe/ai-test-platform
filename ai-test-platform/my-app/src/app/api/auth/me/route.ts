import { auth } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    return successResponse({
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      role: session.user.role ?? null,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('Failed to load current user', 500);
  }
}
