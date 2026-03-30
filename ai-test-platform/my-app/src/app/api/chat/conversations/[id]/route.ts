import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await context.params;
    if (!id) {
      return errors.badRequest('conversation id is required');
    }

    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInt(searchParams.get('limit'), 200, 500);

    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        knowledgeScope: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      return errors.notFound('conversation');
    }

    const rows = await prisma.chatMessage.findMany({
      where: {
        conversationId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const messages = rows
      .slice()
      .reverse()
      .map((item) => ({
        id: item.id,
        role: item.role.toLowerCase(),
        content: item.content,
        meta: item.meta,
        createdAt: item.createdAt.toISOString(),
      }));

    return successResponse({
      ...conversation,
      knowledgeScope: conversation.knowledgeScope || 'all',
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    });
  } catch (error) {
    console.error('Failed to fetch chat conversation detail:', error);
    return errors.internalError();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  void request;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await context.params;
    if (!id) {
      return errors.badRequest('conversation id is required');
    }

    const target = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!target) {
      return errors.notFound('conversation');
    }

    await prisma.chatConversation.delete({
      where: { id },
    });

    return successResponse({ id, deleted: true });
  } catch (error) {
    console.error('Failed to delete chat conversation:', error);
    return errors.internalError();
  }
}
