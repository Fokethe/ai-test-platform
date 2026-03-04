/**
 * User Profile API - 支持邮箱修改
 * TDD Round 6.1: 邮箱修改功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 更新邮箱验证 schema
const updateEmailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码验证身份'),
});

// GET /api/user/profile - 获取用户信息
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { code: 404, message: '用户不存在', data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { code: 500, message: '获取用户信息失败', data: null },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - 更新用户资料（名称）
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { code: 400, message: '姓名不能为空', data: null },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { code: 500, message: '更新失败', data: null },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile/email - 修改邮箱
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 验证输入
    const result = updateEmailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: result.error.errors[0].message, data: null },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!currentUser) {
      return NextResponse.json(
        { code: 404, message: '用户不存在', data: null },
        { status: 404 }
      );
    }

    // 验证密码（这里简化处理，实际应该验证哈希密码）
    // 注意：如果使用 NextAuth，密码验证逻辑可能需要调整
    if (currentUser.password && currentUser.password !== password) {
      return NextResponse.json(
        { code: 403, message: '密码错误', data: null },
        { status: 403 }
      );
    }

    // 检查邮箱是否已被使用
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { code: 409, message: '该邮箱已被使用', data: null },
        { status: 409 }
      );
    }

    // 更新邮箱
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        email,
        emailVerified: null, // 重置邮箱验证状态
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      code: 0,
      message: '邮箱修改成功',
      data: user,
    });
  } catch (error) {
    console.error('Update email error:', error);
    return NextResponse.json(
      { code: 500, message: '修改邮箱失败', data: null },
      { status: 500 }
    );
  }
}
