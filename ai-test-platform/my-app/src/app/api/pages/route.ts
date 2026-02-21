import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/pages?systemId=xxx - 获取页面列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');

    if (!systemId) {
      return NextResponse.json(
        errorResponse('缺少系统ID', 1002),
        { status: 400 }
      );
    }

    const pages = await prisma.page.findMany({
      where: { systemId },
      include: {
        _count: { select: { testCases: true, requirements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse({ list: pages }));
  } catch (error) {
    console.error('Get pages error:', error);
    return NextResponse.json(
      errorResponse('获取页面失败'),
      { status: 500 }
    );
  }
}

// POST /api/pages - 创建页面
const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  path: z.string().min(1, '路径不能为空'),
  systemId: z.string(),
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

    const { systemId, ...data } = result.data;

    const page = await prisma.page.create({
      data: {
        ...data,
        systemId,
      },
      include: {
        _count: { select: { testCases: true, requirements: true } },
      },
    });

    return NextResponse.json(successResponse(page, '创建成功'));
  } catch (error) {
    console.error('Create page error:', error);
    return NextResponse.json(
      errorResponse('创建页面失败'),
      { status: 500 }
    );
  }
}
