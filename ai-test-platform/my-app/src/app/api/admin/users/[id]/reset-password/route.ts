import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
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

// 重置密码验证 schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, '密码至少6位'),
});

// POST /api/admin/users/[id]/reset-password - 重置用户密码
export async function POST(
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
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { password } = result.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json(successResponse(null, '密码重置成功'));
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(errorResponse('重置密码失败'), { status: 500 });
  }
}
