/**
 * User Detail API
 * GET /api/users/[id] - 获取用户详情
 * PUT /api/users/[id] - 更新用户（角色、密码重置）
 * DELETE /api/users/[id] - 删除用户
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

/**
 * 发送密码重置邮件
 * TODO: 集成真实邮件服务（如 SendGrid, Resend）
 */
async function sendPasswordResetEmail(email: string, userId: string): Promise<void> {
  // 当前为模拟实现，打印日志表示邮件已发送
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email] Password reset sent to ${email} (User ID: ${userId})`);
  }
  
  // 实际项目中，这里应该调用邮件服务API
}

// GET - 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errors.notFound('用户');
    }

    return successResponse(user);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('获取用户详情失败', 500);
  }
}

// PUT - 更新用户（角色、重置密码）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }

    const { role, status, name, resetPassword } = body;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return errors.notFound('用户');
    }

    // 构建更新数据
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    
    // 重置密码
    if (resetPassword) {
      updateData.password = Math.random().toString(36).slice(-16);
      // 发送密码重置邮件
      await sendPasswordResetEmail(existingUser.email, id);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const message = resetPassword ? '密码已重置' : '更新成功';
    return successResponse(user, message);
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('更新用户失败', 500);
  }
}

// DELETE - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;

    // 防止自删除
    if (session.user.id === id) {
      return errors.badRequest('不能删除当前登录用户');
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return errors.notFound('用户');
    }

    await prisma.user.delete({
      where: { id },
    });

    return successResponse(null, '用户已删除');
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('删除用户失败', 500);
  }
}
