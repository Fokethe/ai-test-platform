import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/notifications - 获取当前用户的消息列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const read = searchParams.get('read');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = { userId: session.user.id };
    if (type && type !== 'all') where.type = type;
    if (read !== null && read !== undefined && read !== '') {
      where.read = read === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json(successResponse({
      notifications,
      unreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }));
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(errorResponse('获取消息列表失败'), { status: 500 });
  }
}

// 创建消息验证 schema（用于系统通知）
const createNotificationSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['SYSTEM', 'EXECUTION', 'INVITE']),
  userId: z.string(),
  data: z.any().optional(),
});

// POST /api/notifications - 创建消息（内部使用或管理员使用）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = createNotificationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { title, content, type, userId, data } = result.data;

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type,
        userId,
        data: data ? JSON.stringify(data) : null,
      },
    });

    return NextResponse.json(successResponse(notification, '消息创建成功'));
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(errorResponse('创建消息失败'), { status: 500 });
  }
}

// PUT /api/notifications - 标记所有消息为已读
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'mark-all-read') {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });

      return NextResponse.json(successResponse(null, '全部标记为已读'));
    }

    if (action === 'clear-all') {
      await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });

      return NextResponse.json(successResponse(null, '消息已清空'));
    }

    return NextResponse.json(errorResponse('无效的操作'), { status: 400 });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json(errorResponse('操作失败'), { status: 500 });
  }
}
