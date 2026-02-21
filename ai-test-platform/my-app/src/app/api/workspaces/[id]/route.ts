import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/workspaces/:id - 获取工作空间详情
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

    // 检查用户是否有权限访问该工作空间
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(notFoundResponse('工作空间'), { status: 404 });
    }

    return NextResponse.json(successResponse(workspace));
  } catch (error) {
    console.error('Get workspace error:', error);
    return NextResponse.json(
      errorResponse('获取工作空间失败'),
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/:id - 更新工作空间
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

    // 检查权限（OWNER 或 ADMIN）
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(successResponse(workspace, '更新成功'));
  } catch (error) {
    console.error('Update workspace error:', error);
    return NextResponse.json(
      errorResponse('更新工作空间失败'),
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/:id - 删除工作空间
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

    // 只有 OWNER 可以删除
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    await prisma.workspace.delete({ where: { id } });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      errorResponse('删除工作空间失败'),
      { status: 500 }
    );
  }
}
