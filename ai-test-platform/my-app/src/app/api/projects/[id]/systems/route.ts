import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/projects/:id/systems - 获取项目的系统列表
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

    // 获取项目信息以检查权限
    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!project) {
      return NextResponse.json(errorResponse('项目不存在'), { status: 404 });
    }

    // 检查用户是否有权限访问该工作空间
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const systems = await prisma.system.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pages: true },
        },
      },
    });

    return NextResponse.json(successResponse({ list: systems }));
  } catch (error) {
    console.error('Get project systems error:', error);
    return NextResponse.json(
      errorResponse('获取系统列表失败'),
      { status: 500 }
    );
  }
}
