import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// 检查是否为管理员
async function checkAdmin(session: any) {
  if (!session?.user?.id) return false;
  if (session.user.role === 'ADMIN') return true;
  
  // 检查数据库中的用户角色
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  return user?.role === 'ADMIN';
}

// GET /api/admin/config - 获取系统配置
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    // 从数据库获取配置，如果没有则使用默认值
    const config = await prisma.systemConfig.findFirst();

    const defaultConfig = {
      executionTimeout: 300,
      maxConcurrentExecutions: 5,
      logRetentionDays: 30,
      enableAutoCleanup: true,
      enableEmailNotification: true,
      maintenanceMode: false,
      apiRateLimit: 100,
    };

    return NextResponse.json(successResponse({ ...defaultConfig, ...config }));
  } catch (error) {
    console.error('Get system config error:', error);
    return NextResponse.json(
      errorResponse('获取系统配置失败'),
      { status: 500 }
    );
  }
}

// POST /api/admin/config - 更新系统配置
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const isAdmin = await checkAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(forbiddenResponse(), { status: 403 });
    }

    const body = await request.json();
    const {
      executionTimeout,
      maxConcurrentExecutions,
      logRetentionDays,
      enableAutoCleanup,
      enableEmailNotification,
      maintenanceMode,
      apiRateLimit,
    } = body;

    // 验证参数
    if (executionTimeout !== undefined && (executionTimeout < 60 || executionTimeout > 3600)) {
      return NextResponse.json(
        errorResponse('执行超时时间必须在 60-3600 秒之间', 1002),
        { status: 400 }
      );
    }

    if (maxConcurrentExecutions !== undefined && (maxConcurrentExecutions < 1 || maxConcurrentExecutions > 20)) {
      return NextResponse.json(
        errorResponse('并发执行数量必须在 1-20 之间', 1002),
        { status: 400 }
      );
    }

    if (logRetentionDays !== undefined && (logRetentionDays < 7 || logRetentionDays > 365)) {
      return NextResponse.json(
        errorResponse('日志保留天数必须在 7-365 天之间', 1002),
        { status: 400 }
      );
    }

    // 更新或创建配置
    const existingConfig = await prisma.systemConfig.findFirst();
    
    let config;
    if (existingConfig) {
      config = await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: {
          executionTimeout,
          maxConcurrentExecutions,
          logRetentionDays,
          enableAutoCleanup,
          enableEmailNotification,
          maintenanceMode,
          apiRateLimit,
        },
      });
    } else {
      config = await prisma.systemConfig.create({
        data: {
          executionTimeout: executionTimeout ?? 300,
          maxConcurrentExecutions: maxConcurrentExecutions ?? 5,
          logRetentionDays: logRetentionDays ?? 30,
          enableAutoCleanup: enableAutoCleanup ?? true,
          enableEmailNotification: enableEmailNotification ?? true,
          maintenanceMode: maintenanceMode ?? false,
          apiRateLimit: apiRateLimit ?? 100,
        },
      });
    }

    return NextResponse.json(successResponse(config, '配置已更新'));
  } catch (error) {
    console.error('Update system config error:', error);
    return NextResponse.json(
      errorResponse('更新系统配置失败'),
      { status: 500 }
    );
  }
}
