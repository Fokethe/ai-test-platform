/**
 * Export Logs API
 * 导出活动日志
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { unauthorizedResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { format = 'csv' } = body;

    // 获取所有日志 - 使用 Activity 模型
    const logs = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      // JSON 格式导出
      const jsonData = logs.map(log => ({
        id: log.id,
        action: log.action,
        actor: log.actorId || 'System',
        target: log.target || '-',
        targetId: log.targetId,
        createdAt: log.createdAt.toISOString(),
      }));

      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      // CSV 格式导出
      const headers = ['ID', 'Action', 'Actor', 'Target', 'TargetId', 'Created At'];
      const rows = logs.map(log => [
        log.id,
        log.action,
        log.actorId || 'System',
        log.target || '-',
        log.targetId,
        log.createdAt.toISOString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to export logs:', error);
    return new Response(JSON.stringify({ error: '导出日志失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
