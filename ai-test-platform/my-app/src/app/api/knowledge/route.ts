import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createKnowledgeSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().min(1, '项目ID不能为空'),
});

const querySchema = z.object({
  projectId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  authorId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      projectId: searchParams.get('projectId') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      authorId: searchParams.get('authorId') || undefined,
    });

    const page = Number.parseInt(query.page || '1', 10);
    const pageSize = Number.parseInt(query.pageSize || '20', 10);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { content: { contains: query.search } },
      ];
    }

    if (query.projectId) {
      const hasAccess = await checkProjectAccess(session.user.id, query.projectId);
      if (!hasAccess) {
        return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 });
      }
    }

    const total = await prisma.knowledgeEntry.count({ where });
    const items = await prisma.knowledgeEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const projectIds = [...new Set(items.map((item) => item.projectId).filter((id): id is string => Boolean(id)))];
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    const projectMap = new Map(projects.map((project) => [project.id, project]));

    const itemsWithProject = items.map((item) => ({
      ...item,
      project: item.projectId ? projectMap.get(item.projectId) || null : null,
    }));

    return NextResponse.json({
      data: itemsWithProject,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取知识库列表失败', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: '获取知识库列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const data = createKnowledgeSchema.parse(body);

    const hasAccess = await checkProjectAccess(session.user.id, data.projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 });
    }

    const knowledge = await prisma.knowledgeEntry.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: JSON.stringify(data.tags || []),
        projectId: data.projectId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ data: { ...knowledge, project } }, { status: 201 });
  } catch (error) {
    console.error('创建知识库条目失败', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: '创建知识库条目失败' }, { status: 500 });
  }
}

async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    return Boolean(project);
  } catch (error) {
    console.error('检查项目权限失败', error);
    return false;
  }
}
