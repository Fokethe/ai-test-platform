import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

async function checkAdmin(session: any) {
  if (!session?.user?.id) return false;
  if (session.user.role === 'admin') return true;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  return user?.role === 'admin';
}

// POST /api/admin/config/restore - 恢复数据备份
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
    const { version, systemConfig, knowledgeEntries } = body;

    // 验证备份文件格式
    if (!version) {
      return NextResponse.json(
        errorResponse('无效的备份文件格式', 1002),
        { status: 400 }
      );
    }

    // 恢复系统配置
    if (systemConfig) {
      const existingConfig = await prisma.systemConfig.findFirst();
      if (existingConfig) {
        await prisma.systemConfig.update({
          where: { id: existingConfig.id },
          data: {
            executionTimeout: systemConfig.executionTimeout,
            maxConcurrentExecutions: systemConfig.maxConcurrentExecutions,
            logRetentionDays: systemConfig.logRetentionDays,
            enableAutoCleanup: systemConfig.enableAutoCleanup,
            enableEmailNotification: systemConfig.enableEmailNotification,
            maintenanceMode: systemConfig.maintenanceMode,
            apiRateLimit: systemConfig.apiRateLimit,
          },
        });
      } else {
        await prisma.systemConfig.create({
          data: {
            executionTimeout: systemConfig.executionTimeout ?? 300,
            maxConcurrentExecutions: systemConfig.maxConcurrentExecutions ?? 5,
            logRetentionDays: systemConfig.logRetentionDays ?? 30,
            enableAutoCleanup: systemConfig.enableAutoCleanup ?? true,
            enableEmailNotification: systemConfig.enableEmailNotification ?? true,
            maintenanceMode: systemConfig.maintenanceMode ?? false,
            apiRateLimit: systemConfig.apiRateLimit ?? 100,
          },
        });
      }
    }

    // 恢复知识库条目（可选，只恢复当前用户没有的条目）
    if (knowledgeEntries && Array.isArray(knowledgeEntries)) {
      for (const entry of knowledgeEntries) {
        const existingEntry = await prisma.knowledgeEntry.findFirst({
          where: { title: entry.title },
        });
        
        if (!existingEntry) {
          await prisma.knowledgeEntry.create({
            data: {
              title: entry.title,
              content: entry.content,
              category: entry.category,
              tags: entry.tags || [],
              authorId: session.user.id,
            },
          });
        }
      }
    }

    return NextResponse.json(successResponse(null, '数据恢复成功'));
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      errorResponse('数据恢复失败'),
      { status: 500 }
    );
  }
}
