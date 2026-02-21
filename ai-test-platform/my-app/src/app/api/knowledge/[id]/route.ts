import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// GET /api/knowledge/:id - 获取单个知识条目
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(notFoundResponse('知识条目'), { status: 404 });
    }

    return NextResponse.json(successResponse(entry));
  } catch (error) {
    console.error('Get knowledge entry error:', error);
    return NextResponse.json(
      errorResponse('获取知识条目失败'),
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/:id - 更新知识条目
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id: params.id },
    });

    if (!existingEntry) {
      return NextResponse.json(notFoundResponse('知识条目'), { status: 404 });
    }

    // 检查权限（只有作者或管理员可以编辑）
    if (existingEntry.authorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        errorResponse('无权编辑此条目', 1003),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category, tags } = body;

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

    const updatedEntry = await prisma.knowledgeEntry.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
      },
    });

    return NextResponse.json(successResponse(updatedEntry, '更新成功'));
  } catch (error) {
    console.error('Update knowledge entry error:', error);
    return NextResponse.json(
      errorResponse('更新知识条目失败'),
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/:id - 删除知识条目
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id: params.id },
    });

    if (!existingEntry) {
      return NextResponse.json(notFoundResponse('知识条目'), { status: 404 });
    }

    // 检查权限（只有作者或管理员可以删除）
    if (existingEntry.authorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        errorResponse('无权删除此条目', 1003),
        { status: 403 }
      );
    }

    await prisma.knowledgeEntry.delete({
      where: { id: params.id },
    });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete knowledge entry error:', error);
    return NextResponse.json(
      errorResponse('删除知识条目失败'),
      { status: 500 }
    );
  }
}
