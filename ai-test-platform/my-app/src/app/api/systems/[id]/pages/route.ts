import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/systems/:id/pages - 获取系统的页面列表
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

    // 获取系统信息以检查权限
    const system = await prisma.system.findUnique({
      where: { id },
      include: { project: { include: { workspace: true } } },
    });

    if (!system) {
      return NextResponse.json(errorResponse('系统不存在'), { status: 404 });
    }

    // 检查用户是否有权限访问该工作空间
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: system.project.workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const pages = await prisma.page.findMany({
      where: { systemId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
    });

    return NextResponse.json(successResponse({ list: pages }));
  } catch (error) {
    console.error('Get system pages error:', error);
    return NextResponse.json(
      errorResponse('获取页面列表失败'),
      { status: 500 }
    );
  }
}
