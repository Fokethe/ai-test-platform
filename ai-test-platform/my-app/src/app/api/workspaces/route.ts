import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/workspaces - 获取工作空间列表
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100); // Max 100 items
    const keyword = searchParams.get('keyword') || '';

    const where = {
      members: {
        some: { userId: session.user.id },
      },
      ...(keyword && {
        name: { contains: keyword },
      }),
    };

    // Use Promise.all for parallel queries with optimized field selection
    const [list, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { projects: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workspace.count({ where }),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[API Timing] GET /api/workspaces: ${duration}ms (items: ${list.length}, total: ${total})`);

    return NextResponse.json(
      successResponse({
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }),
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] GET /api/workspaces failed: ${duration}ms`, error);
    return NextResponse.json(
      errorResponse('获取工作空间失败'),
      { status: 500 }
    );
  }
}

// POST /api/workspaces - 创建工作空间
const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称最多100字符'),
  description: z.string().max(500, '描述最多500字符').optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    const workspace = await prisma.workspace.create({
      data: {
        ...result.data,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { projects: true, members: true } },
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[API Timing] POST /api/workspaces: ${duration}ms (workspaceId: ${workspace.id})`);

    return NextResponse.json(successResponse(workspace, '创建成功'));
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] POST /api/workspaces failed: ${duration}ms`, error);
    return NextResponse.json(
      errorResponse('创建工作空间失败'),
      { status: 500 }
    );
  }
}
