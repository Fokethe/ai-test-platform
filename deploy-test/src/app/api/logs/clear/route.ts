/**
 * Clear Logs API
 * 清空活动日志
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    // 检查用户权限（只有管理员可以清空日志）
    if (session.user.role !== 'ADMIN') {
      return errorResponse('权限不足', 403);
    }

    // 清空所有日志 - 使用 Activity 模型
    await prisma.activity.deleteMany({});

    // 记录清空操作
    await prisma.activity.create({
      data: {
        action: 'DELETE',
        target: 'All Logs',
        targetId: 'all',
        actorId: session.user.id,
        actorType: 'USER',
      },
    });

    return successResponse({ success: true, message: '日志已清空' });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return errorResponse('清空日志失败');
  }
}
