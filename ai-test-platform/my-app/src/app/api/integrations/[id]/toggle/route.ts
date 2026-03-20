import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

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
      return errors.badRequest('integration id is required');
    }

    const existing = await prisma.integration.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!existing) {
      return errors.notFound('integration');
    }

    const integration = await prisma.integration.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    return successResponse(integration);
  } catch (error) {
    console.error('Failed to toggle integration status:', error);
    return errors.internalError();
  }
}
