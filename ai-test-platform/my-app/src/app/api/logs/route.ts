import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// GET /api/logs - 获取日志列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // 检查是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const level = searchParams.get('level');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    if (type) where.type = type;
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.log.count({ where }),
    ]);

    return NextResponse.json(successResponse({
      list: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }));
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      errorResponse('获取日志失败'),
      { status: 500 }
    );
  }
}

// POST /api/logs - 创建日志（内部使用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, level, userId, action, target, targetId, message, details, ip } = body;

    const log = await prisma.log.create({
      data: {
        type,
        level,
        userId,
        action,
        target,
        targetId,
        message,
        details,
        ip,
      },
    });

    return NextResponse.json(successResponse(log));
  } catch (error) {
    console.error('Create log error:', error);
    return NextResponse.json(
      errorResponse('创建日志失败'),
      { status: 500 }
    );
  }
}
