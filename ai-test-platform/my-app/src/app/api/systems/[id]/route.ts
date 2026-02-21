import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';

// GET /api/systems/:id - 获取系统详情
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

    const system = await prisma.system.findUnique({
      where: { id },
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
    });

    if (!system) {
      return NextResponse.json(notFoundResponse('系统'), { status: 404 });
    }

    // 检查用户是否有权限访问
    if (system.project.workspace.members.length === 0) {
      return NextResponse.json(
        errorResponse('您没有权限访问此系统', 1003),
        { status: 403 }
      );
    }

    return NextResponse.json(successResponse(system));
  } catch (error) {
    console.error('Get system error:', error);
    return NextResponse.json(
      errorResponse('获取系统失败'),
      { status: 500 }
    );
  }
}

// PUT /api/systems/:id - 更新系统
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

    const system = await prisma.system.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(successResponse(system, '更新成功'));
  } catch (error) {
    console.error('Update system error:', error);
    return NextResponse.json(
      errorResponse('更新系统失败'),
      { status: 500 }
    );
  }
}

// DELETE /api/systems/:id - 删除系统
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

    await prisma.system.delete({ where: { id } });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete system error:', error);
    return NextResponse.json(
      errorResponse('删除系统失败'),
      { status: 500 }
    );
  }
}
