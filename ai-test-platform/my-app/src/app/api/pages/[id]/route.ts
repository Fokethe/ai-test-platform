import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';

// GET /api/pages/:id - 获取页面详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        system: {
          include: {
            project: {
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { userId: session.user.id },
                    },
                  },
                },
              },
            },
          },
        },
        requirements: {
          select: {
            id: true,
            title: true,
          },
        },
        testCases: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            isAiGenerated: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!page) {
      return NextResponse.json(notFoundResponse('页面'), { status: 404 });
    }

    // 检查用户是否有权限访问
    if (page.system.project.workspace.members.length === 0) {
      return NextResponse.json(
        errorResponse('您没有权限访问此页面', 1003),
        { status: 403 }
      );
    }

    return NextResponse.json(successResponse(page));
  } catch (error) {
    console.error('Get page error:', error);
    return NextResponse.json(
      errorResponse('获取页面失败'),
      { status: 500 }
    );
  }
}

// PUT /api/pages/:id - 更新页面
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const page = await prisma.page.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(successResponse(page, '更新成功'));
  } catch (error) {
    console.error('Update page error:', error);
    return NextResponse.json(
      errorResponse('更新页面失败'),
      { status: 500 }
    );
  }
}

// DELETE /api/pages/:id - 删除页面
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    await prisma.page.delete({ where: { id } });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete page error:', error);
    return NextResponse.json(
      errorResponse('删除页面失败'),
      { status: 500 }
    );
  }
}
