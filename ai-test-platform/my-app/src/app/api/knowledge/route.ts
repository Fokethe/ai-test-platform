import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// GET /api/knowledge - 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const entries = await prisma.knowledgeEntry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(entries));
  } catch (error) {
    console.error('Get knowledge entries error:', error);
    return NextResponse.json(
      errorResponse('获取知识库列表失败'),
      { status: 500 }
    );
  }
}

// POST /api/knowledge - 创建知识条目
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const { title, content, category = 'other', tags = [] } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        errorResponse('标题不能为空', 1002),
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        errorResponse('内容不能为空', 1002),
        { status: 400 }
      );
    }

    const entry = await prisma.knowledgeEntry.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(successResponse(entry, '创建成功'));
  } catch (error) {
    console.error('Create knowledge entry error:', error);
    return NextResponse.json(
      errorResponse('创建知识条目失败'),
      { status: 500 }
    );
  }
}
