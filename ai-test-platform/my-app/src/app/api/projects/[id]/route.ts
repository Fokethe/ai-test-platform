import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/projects/:id - 获取项目详情
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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
        _count: {
          select: { systems: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(notFoundResponse('项目'), { status: 404 });
    }

    // 检查用户是否有权限访问
    if (project.workspace.members.length === 0) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    return NextResponse.json(successResponse(project));
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      errorResponse('获取项目失败'),
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id - 更新项目
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

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(successResponse(project, '更新成功'));
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      errorResponse('更新项目失败'),
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - 删除项目
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

    await prisma.project.delete({ where: { id } });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      errorResponse('删除项目失败'),
      { status: 500 }
    );
  }
}
