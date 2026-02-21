import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/workspaces/:id/projects - 获取工作空间的项目列表
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

    const projects = await prisma.project.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { systems: true },
        },
      },
    });

    return NextResponse.json(successResponse({ list: projects }));
  } catch (error) {
    console.error('Get workspace projects error:', error);
    return NextResponse.json(
      errorResponse('获取项目列表失败'),
      { status: 500 }
    );
  }
}
