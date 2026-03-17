/**
 * Report PDF Export API
 * TDD Batch 6A: PDF导出功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const exportSchema = z.object({
  type: z.string(),
  timeRange: z.string(),
  data: z.object({
    stats: z.record(z.string(), z.any()),
    trendData: z.array(z.any()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = exportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: '参数错误', data: null },
        { status: 400 }
      );
    }

    const { type, timeRange, data } = result.data;

    // 生成简单的PDF内容（HTML格式）
    const html = generateReportHTML(type, timeRange, data);

    // 返回HTML内容（实际项目应使用puppeteer转换为PDF）
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="质量报告-${type}-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    console.error('Export PDF error:', error);
    return NextResponse.json(
      { code: 500, message: '导出失败', data: null },
      { status: 500 }
    );
  }
}

function generateReportHTML(type: string, timeRange: string, data: any): string {
  const { stats } = data;
  const title = `质量报告 - ${type === 'summary' ? '质量概览' : type === 'regression' ? '回归测试' : type === 'smoke' ? '冒烟测试' : '综合报告'}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .stat-title { color: #6b7280; font-size: 14px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #111827; margin-top: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>时间范围: ${timeRange === '7d' ? '最近7天' : timeRange === '30d' ? '最近30天' : '最近90天'}</p>
  <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-title">总问题数</div>
      <div class="stat-value">${stats.totalIssues || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">开放问题</div>
      <div class="stat-value">${stats.openIssues || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">已解决问题</div>
      <div class="stat-value">${stats.resolvedIssues || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">执行通过率</div>
      <div class="stat-value">${stats.totalRuns > 0 ? Math.round((stats.passedRuns / stats.totalRuns) * 100) : 0}%</div>
    </div>
  </div>
  
  <div class="footer">
    由 AI Test Platform 自动生成
  </div>
</body>
</html>`;
}
