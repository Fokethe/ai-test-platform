import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/projects?workspaceId=xxx - 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        errorResponse('缺少工作空间ID', 1002),
        { status: 400 }
      );
    }

    // 检查用户是否有权限访问该工作空间
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { systems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse({ list: projects }));
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      errorResponse('获取项目失败'),
      { status: 500 }
    );
  }
}

// POST /api/projects - 创建项目
const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  description: z.string().max(500).optional(),
  workspaceId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { workspaceId, ...data } = result.data;

    // 检查权限
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!member) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        workspaceId,
      },
      include: {
        _count: { select: { systems: true } },
      },
    });

    return NextResponse.json(successResponse(project, '创建成功'));
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      errorResponse('创建项目失败'),
      { status: 500 }
    );
  }
}
