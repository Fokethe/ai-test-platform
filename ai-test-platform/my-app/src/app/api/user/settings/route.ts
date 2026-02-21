import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

const updateSchema = z.object({
  emailNotify: z.boolean().optional(),
  pushNotify: z.boolean().optional(),
  executionNotify: z.boolean().optional(),
  inviteNotify: z.boolean().optional(),
  systemNotify: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  twoFactorAuth: z.boolean().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

// GET /api/user/settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // 获取或创建用户设置
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // 如果不存在，创建默认设置
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          emailNotify: true,
          pushNotify: true,
          executionNotify: true,
          inviteNotify: true,
          systemNotify: true,
          darkMode: false,
          autoRun: false,
          twoFactorAuth: false,
        },
      });
    }

    // 获取用户的语言和时区设置
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, timezone: true },
    });

    return NextResponse.json(successResponse({
      ...settings,
      language: user?.language || 'zh-CN',
      timezone: user?.timezone || 'Asia/Shanghai',
    }));
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(errorResponse('获取用户设置失败'), { status: 500 });
  }
}

// PUT /api/user/settings - 保存语言和时区
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { language, timezone, ...settingsData } = result.data;

    // 使用事务更新用户设置和用户信息
    const [settings, user] = await prisma.$transaction([
      // 更新通知设置
      prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: settingsData,
        create: {
          userId: session.user.id,
          emailNotify: settingsData.emailNotify ?? true,
          pushNotify: settingsData.pushNotify ?? true,
          executionNotify: settingsData.executionNotify ?? true,
          inviteNotify: settingsData.inviteNotify ?? true,
          systemNotify: settingsData.systemNotify ?? true,
          darkMode: settingsData.darkMode ?? false,
          autoRun: settingsData.autoRun ?? false,
          twoFactorAuth: settingsData.twoFactorAuth ?? false,
        },
      }),
      // 更新语言和时区
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(language && { language }),
          ...(timezone && { timezone }),
        },
        select: { language: true, timezone: true },
      }),
    ]);

    return NextResponse.json(successResponse({
      ...settings,
      ...user,
    }, '设置已更新'));
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(errorResponse('更新用户设置失败'), { status: 500 });
  }
}

// PATCH /api/user/settings - 部分更新设置
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    // 使用 upsert 确保设置存在
    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: result.data,
      create: {
        userId: session.user.id,
        emailNotify: result.data.emailNotify ?? true,
        pushNotify: result.data.pushNotify ?? true,
        executionNotify: result.data.executionNotify ?? true,
        inviteNotify: result.data.inviteNotify ?? true,
        systemNotify: result.data.systemNotify ?? true,
        darkMode: result.data.darkMode ?? false,
        autoRun: result.data.autoRun ?? false,
        twoFactorAuth: result.data.twoFactorAuth ?? false,
      },
    });

    return NextResponse.json(successResponse(settings, '设置已更新'));
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(errorResponse('更新用户设置失败'), { status: 500 });
  }
}
