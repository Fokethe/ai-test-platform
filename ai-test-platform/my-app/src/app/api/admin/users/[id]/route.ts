import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

// 验证是否为管理员
async function verifyAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === 'ADMIN';
}

// GET /api/admin/users/[id] - 获取单个用户信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const isAdmin = await verifyAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        timezone: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    return NextResponse.json(successResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(errorResponse('获取用户信息失败'), { status: 500 });
  }
}

// 更新用户验证 schema
const updateUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50字符').optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  role: z.enum(['ADMIN', 'USER', 'GUEST']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

// PUT /api/admin/users/[id] - 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const isAdmin = await verifyAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const { id } = await params;

    // 不能修改自己
    if (id === session.user.id) {
      return NextResponse.json(
        errorResponse('不能通过此接口修改自己的信息', 1004),
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    // 如果更新邮箱，检查是否已存在
    if (result.data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: result.data.email,
          NOT: { id },
        },
      });
      if (existingUser) {
        return NextResponse.json(
          errorResponse('该邮箱已被其他用户使用', 1003),
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        timezone: true,
        language: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(user, '用户信息更新成功'));
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(errorResponse('更新用户信息失败'), { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const isAdmin = await verifyAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const { id } = await params;

    // 不能删除自己
    if (id === session.user.id) {
      return NextResponse.json(
        errorResponse('不能删除自己的账户', 1004),
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(successResponse(null, '用户删除成功'));
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(errorResponse('删除用户失败'), { status: 500 });
  }
}
