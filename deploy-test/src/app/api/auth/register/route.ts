/**
 * 用户注册 API
 * POST /api/auth/register - 用户自主注册
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

// POST - 用户注册
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('无效的 JSON 请求体', 400);
    }

    const { name, email, password } = body;

    // 校验必填字段
    if (!email || !password) {
      return errorResponse('邮箱和密码不能为空', 400);
    }

    // 校验邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('邮箱格式不正确', 400);
    }

    // 校验密码长度
    if (password.length < 6) {
      return errorResponse('密码长度至少为6位', 400);
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse('该邮箱已被注册', 409);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return successResponse(user, '注册成功');
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('注册失败，请稍后重试', 500);
  }
}
