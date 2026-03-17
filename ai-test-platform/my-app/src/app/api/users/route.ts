/**
 * Users API
 * GET /api/users - 获取用户列表
 * POST /api/users - 邀请新用户
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { generateTempPassword } from '@/lib/security/password';

/**
 * 发送邀请邮件
 * TODO: 集成真实邮件服务（如 SendGrid, Resend）
 */
async function sendInvitationEmail(email: string, userId: string): Promise<void> {
  // 当前为模拟实现，打印日志表示邮件已发送
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email] Invitation sent to ${email} (User ID: ${userId})`);
  }
  
  // 实际项目中，这里应该调用邮件服务API
  // 例如：
  // await sendgrid.send({
  //   to: email,
  //   template: 'invitation',
  //   data: { userId, inviteUrl: `${process.env.APP_URL}/invite?token=${token}` }
  // });
}

// GET - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(users);
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('获取用户列表失败', 500);
  }
}

// POST - 邀请新用户
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }

    const { email, name, role = 'MEMBER' } = body;

    if (!email) {
      return errors.badRequest('邮箱地址不能为空');
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errors.conflict('该邮箱已被使用');
    }

    // 创建新用户（状态为 PENDING，等待用户激活）
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        role,
        status: 'INACTIVE',
        // 生成随机密码，用户首次登录时需要重置
        password: generateTempPassword(),
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

    // 发送邀请邮件
    await sendInvitationEmail(email, user.id);

    return successResponse(user, '邀请发送成功');
  } catch (error) {
    console.error('Invite user error:', error);
    return errorResponse('邀请用户失败', 500);
  }
}
