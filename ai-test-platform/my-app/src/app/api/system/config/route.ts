/**
 * System Config API
 * 系统配置管理
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// 获取系统配置
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    // 获取或创建默认配置
    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          executionTimeout: 300,
          maxConcurrentExecutions: 5,
          logRetentionDays: 30,
          enableAutoCleanup: true,
          enableEmailNotification: true,
          maintenanceMode: false,
          apiRateLimit: 100,
        },
      });
    }

    return successResponse({
      emailNotifications: config.enableEmailNotification,
      webhookNotifications: true,
      require2FA: false,
      sessionTimeout: 30,
      autoCleanup: config.enableAutoCleanup,
      retentionDays: config.logRetentionDays,
    });
  } catch (error) {
    console.error('Failed to get system config:', error);
    return errorResponse('获取配置失败');
  }
}

// 保存系统配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    // 只有管理员可以修改
    if (session.user.role !== 'ADMIN') {
      return errorResponse('权限不足', 403);
    }

    const body = await request.json();
    const config = await prisma.systemConfig.findFirst();

    const configData = {
      enableAutoCleanup: body.autoCleanup ?? true,
      logRetentionDays: body.retentionDays ?? 30,
      enableEmailNotification: body.emailNotifications ?? true,
    };

    if (config) {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: configData,
      });
    } else {
      await prisma.systemConfig.create({
        data: {
          ...configData,
          executionTimeout: 300,
          maxConcurrentExecutions: 5,
          maintenanceMode: false,
          apiRateLimit: 100,
        },
      });
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to save system config:', error);
    return errorResponse('保存配置失败');
  }
}
