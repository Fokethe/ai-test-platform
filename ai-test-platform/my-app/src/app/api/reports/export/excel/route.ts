/**
 * Report Excel Export API
 * TDD Batch 6A: Excel导出功能
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

    // 生成CSV内容
    const csv = generateCSV(type, timeRange, data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="质量报告-${type}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export Excel error:', error);
    return NextResponse.json(
      { code: 500, message: '导出失败', data: null },
      { status: 500 }
    );
  }
}

function generateCSV(type: string, timeRange: string, data: any): string {
  const { stats, trendData } = data;
  
  let csv = '\ufeff'; // BOM for Excel UTF-8
  
  // 标题
  csv += '质量报告\\n';
  csv += `报告类型,${type}\\n`;
  csv += `时间范围,${timeRange === '7d' ? '最近7天' : timeRange === '30d' ? '最近30天' : '最近90天'}\\n`;
  csv += `生成时间,${new Date().toLocaleString('zh-CN')}\\n\\n`;
  
  // 统计数据
  csv += '统计数据\\n';
  csv += '指标,数值\\n';
  csv += `总问题数,${stats.totalIssues || 0}\\n`;
  csv += `开放问题,${stats.openIssues || 0}\\n`;
  csv += `已解决问题,${stats.resolvedIssues || 0}\\n`;
  csv += `严重问题,${stats.criticalIssues || 0}\\n`;
  csv += `总执行次数,${stats.totalRuns || 0}\\n`;
  csv += `通过次数,${stats.passedRuns || 0}\\n`;
  csv += `失败次数,${stats.failedRuns || 0}\\n`;
  csv += `通过率,${stats.totalRuns > 0 ? Math.round((stats.passedRuns / stats.totalRuns) * 100) : 0}%\\n\\n`;
  
  // 趋势数据
  if (trendData && trendData.length > 0) {
    csv += '趋势数据\\n';
    csv += '日期,新建问题,已解决问题,通过率(%),执行次数\\n';
    trendData.forEach((item: any) => {
      csv += `${item.date},${item.created},${item.resolved},${item.passRate},${item.totalRuns}\\n`;
    });
  }
  
  return csv;
}
