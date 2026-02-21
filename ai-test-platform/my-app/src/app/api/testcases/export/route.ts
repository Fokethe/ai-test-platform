import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/testcases/export?projectId=xxx&format=json
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pageId = searchParams.get('pageId');
    const format = searchParams.get('format') || 'json';

    // 构建查询条件
    const where: any = {};
    if (pageId) {
      where.pageId = pageId;
    } else if (projectId) {
      // 获取项目下所有页面的用例
      const systems = await prisma.system.findMany({
        where: { projectId },
        include: {
          pages: {
            select: { id: true },
          },
        },
      });
      const pageIds = systems.flatMap((s) => s.pages.map((p) => p.id));
      where.pageId = { in: pageIds };
    }

    const testCases = await prisma.testCase.findMany({
      where,
      include: {
        page: {
          include: {
            system: {
              include: {
                project: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 格式化数据
    const formattedCases = testCases.map((tc) => ({
      id: tc.id,
      title: tc.title,
      preCondition: tc.preCondition || '',
      steps: JSON.parse(tc.steps).join('\n'),
      expectation: tc.expectation,
      priority: tc.priority,
      tags: tc.tags ? JSON.parse(tc.tags).join(',') : '',
      status: tc.status,
      page: tc.page.name,
      system: tc.page.system.name,
      project: tc.page.system.project.name,
      createdAt: tc.createdAt.toISOString(),
    }));

    if (format === 'csv') {
      // 生成 CSV
      const headers = [
        'ID',
        '标题',
        '前置条件',
        '步骤',
        '预期结果',
        '优先级',
        '标签',
        '状态',
        '页面',
        '系统',
        '项目',
        '创建时间',
      ];
      const csvContent = [
        headers.join(','),
        ...formattedCases.map((tc) =>
          [
            tc.id,
            `"${tc.title.replace(/"/g, '""')}"`,
            `"${tc.preCondition.replace(/"/g, '""')}"`,
            `"${tc.steps.replace(/"/g, '""')}"`,
            `"${tc.expectation.replace(/"/g, '""')}"`,
            tc.priority,
            `"${tc.tags}"`,
            tc.status,
            tc.page,
            tc.system,
            tc.project,
            tc.createdAt,
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=testcases.csv',
        },
      });
    }

    // 默认返回 JSON
    return NextResponse.json({
      count: formattedCases.length,
      testCases: formattedCases,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('导出测试用例失败:', error);
    return NextResponse.json({ error: '导出测试用例失败' }, { status: 500 });
  }
}
