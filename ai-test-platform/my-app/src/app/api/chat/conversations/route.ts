import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const createConversationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  knowledgeScope: z.string().trim().max(32).optional(),
  projectId: z.string().trim().max(64).optional(),
});

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function toConversationSummary(
  item: {
    id: string;
    title: string;
    knowledgeScope: string | null;
    projectId: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<{ content: string; role: 'USER' | 'ASSISTANT'; createdAt: Date }>;
  }
) {
  const last = item.messages[0];
  return {
    id: item.id,
    title: item.title,
    knowledgeScope: item.knowledgeScope || 'all',
    projectId: item.projectId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastMessage: last
      ? {
          role: last.role.toLowerCase(),
          content: last.content,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInt(searchParams.get('limit'), 50, 200);
    const projectId = searchParams.get('projectId')?.trim() || undefined;

    const rows = await prisma.chatConversation.findMany({
      where: {
        userId: session.user.id,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return successResponse({
      list: rows.map(toConversationSummary),
    });
  } catch (error) {
    console.error('Failed to fetch chat conversations:', error);
    return errors.internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const data = parsed.data;
    const title = data.title?.trim() || '新对话';

    const created = await prisma.chatConversation.create({
      data: {
        userId: session.user.id,
        title,
        knowledgeScope: data.knowledgeScope || 'all',
        projectId: data.projectId || null,
      },
    });

    return successResponse({
      id: created.id,
      title: created.title,
      knowledgeScope: created.knowledgeScope || 'all',
      projectId: created.projectId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      messages: [],
    });
  } catch (error) {
    console.error('Failed to create chat conversation:', error);
    return errors.internalError();
  }
}
