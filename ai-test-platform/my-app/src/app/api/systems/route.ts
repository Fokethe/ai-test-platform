import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/systems?projectId=xxx - 获取系统列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        errorResponse('缺少项目ID', 1002),
        { status: 400 }
      );
    }

    const systems = await prisma.system.findMany({
      where: { projectId },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse({ list: systems }));
  } catch (error) {
    console.error('Get systems error:', error);
    return NextResponse.json(
      errorResponse('获取系统失败'),
      { status: 500 }
    );
  }
}

// POST /api/systems - 创建系统
const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  baseUrl: z.string().url('请输入有效的URL'),
  projectId: z.string(),
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

    const { projectId, ...data } = result.data;

    const system = await prisma.system.create({
      data: {
        ...data,
        projectId,
      },
      include: {
        _count: { select: { pages: true } },
      },
    });

    return NextResponse.json(successResponse(system, '创建成功'));
  } catch (error) {
    console.error('Create system error:', error);
    return NextResponse.json(
      errorResponse('创建系统失败'),
      { status: 500 }
    );
  }
}
