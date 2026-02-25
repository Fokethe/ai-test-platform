import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';

// GET /api/reports/export - 导出报告
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv, xlsx, html
    const type = searchParams.get('type') || 'testcases'; // testcases, executions, bugs
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 根据类型获取数据
    let data: any[] = [];
    let filename = '';
    let sheetName = '';

    switch (type) {
      case 'testcases':
        data = await getTestCasesData(projectId);
        filename = `测试用例报告-${new Date().toISOString().split('T')[0]}`;
        sheetName = '测试用例';
        break;
      case 'executions':
        data = await getExecutionsData(projectId, startDate, endDate);
        filename = `执行报告-${new Date().toISOString().split('T')[0]}`;
        sheetName = '执行记录';
        break;
      case 'bugs':
        data = await getBugsData(projectId, startDate, endDate);
        filename = `Bug报告-${new Date().toISOString().split('T')[0]}`;
        sheetName = 'Bug列表';
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    switch (format) {
      case 'json':
        return new NextResponse(JSON.stringify(data, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
          },
        });

      case 'csv':
        const csv = convertToCSV(data);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });

      case 'xlsx':
        const xlsxBuffer = convertToXLSX(data, sheetName);
        return new NextResponse(xlsxBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          },
        });

      case 'html':
        const html = convertToHTML(data, sheetName);
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.html"`,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// 获取测试用例数据
async function getTestCasesData(projectId?: string | null) {
  const where: any = {};
  if (projectId) {
    where.page = { system: { projectId } };
  }

  const testCases = await prisma.testCase.findMany({
    where,
    include: {
      page: {
        include: {
          system: {
            include: {
              project: { select: { name: true } }
            }
          }
        }
      },
      executions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, createdAt: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return testCases.map(tc => ({
    'ID': tc.id,
    '标题': tc.title,
    '项目': tc.page?.system?.project?.name || '',
    '系统': tc.page?.system?.name || '',
    '页面': tc.page?.name || '',
    '优先级': tc.priority,
    '状态': tc.status,
    '前置条件': tc.preCondition || '',
    '测试步骤': JSON.parse(tc.steps || '[]').map((s: any) => s.action).join('; '),
    '预期结果': tc.expectation,
    '标签': JSON.parse(tc.tags || '[]').join(', '),
    'AI生成': tc.isAiGenerated ? '是' : '否',
    '最后执行状态': tc.executions[0]?.status || '未执行',
    '创建时间': tc.createdAt.toLocaleString('zh-CN'),
    '更新时间': tc.updatedAt.toLocaleString('zh-CN'),
  }));
}

// 获取执行记录数据
async function getExecutionsData(projectId?: string | null, startDate?: string | null, endDate?: string | null) {
  const where: any = {};
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const executions = await prisma.testExecution.findMany({
    where,
    include: {
      testCase: {
        include: {
          page: {
            include: {
              system: {
                include: {
                  project: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      },
      run: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // 过滤项目
  let filtered = executions;
  if (projectId) {
    filtered = executions.filter(e => e.testCase?.page?.system?.project?.id === projectId);
  }

  return filtered.map(e => ({
    'ID': e.id,
    '测试用例': e.testCase?.title || '',
    '项目': e.testCase?.page?.system?.project?.name || '',
    '执行状态': e.status,
    '耗时(ms)': e.duration || '',
    '错误信息': e.errorMessage || '',
    '浏览器': e.run?.browser || '',
    '执行时间': e.createdAt.toLocaleString('zh-CN'),
  }));
}

// 获取 Bug 数据
async function getBugsData(projectId?: string | null, startDate?: string | null, endDate?: string | null) {
  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const bugs = await prisma.bug.findMany({
    where,
    include: {
      project: { select: { name: true } },
      reporter: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
      testCase: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return bugs.map(b => ({
    'ID': b.id,
    '标题': b.title,
    '项目': b.project?.name || '',
    '严重程度': b.severity,
    '状态': b.status,
    '报告人': b.reporter?.name || b.reporter?.email || '',
    '处理人': b.assignee?.name || b.assignee?.email || '',
    '关联用例': b.testCase?.title || '',
    '描述': b.description || '',
    '创建时间': b.createdAt.toLocaleString('zh-CN'),
    '更新时间': b.updatedAt.toLocaleString('zh-CN'),
  }));
}

// 转换为 CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      // 处理包含逗号或换行的字段
      if (typeof val === 'string' && (val.includes(',') || val.includes('\n') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// 转换为 XLSX
function convertToXLSX(data: any[], sheetName: string): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// 转换为 HTML
function convertToHTML(data: any[], title: string): string {
  if (data.length === 0) {
    return `<html><body><h1>${title}</h1><p>无数据</p></body></html>`;
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => `<th>${h}</th>`).join('');
  const rows = data.map(row => 
    `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .meta { color: #666; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
