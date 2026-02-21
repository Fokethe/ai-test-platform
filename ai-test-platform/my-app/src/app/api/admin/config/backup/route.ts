import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';
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

// POST /api/admin/config/backup - 创建数据备份
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

    // 收集所有需要备份的数据
    const [
      systemConfig,
      knowledgeEntries,
      workspaces,
      projects,
      systems,
      pages,
      testCases,
      testSuites,
      executions,
    ] = await Promise.all([
      prisma.systemConfig.findFirst(),
      prisma.knowledgeEntry.findMany(),
      prisma.workspace.findMany(),
      prisma.project.findMany(),
      prisma.system.findMany(),
      prisma.page.findMany(),
      prisma.testCase.findMany(),
      prisma.testSuite.findMany(),
      prisma.execution.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      systemConfig,
      knowledgeEntries,
      workspaces,
      projects,
      systems,
      pages,
      testCases,
      testSuites,
      executions,
    };

    // 返回 JSON 文件
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-test-platform-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { code: 1000, message: '备份失败', data: null },
      { status: 500 }
    );
  }
}
