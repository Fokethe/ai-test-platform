import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

type ReportType = 'executions' | 'testcases' | 'bugs';
type ReportFormat = 'xlsx' | 'csv' | 'html' | 'json';

function isReportType(value: string): value is ReportType {
  return value === 'executions' || value === 'testcases' || value === 'bugs';
}

function isReportFormat(value: string): value is ReportFormat {
  return value === 'xlsx' || value === 'csv' || value === 'html' || value === 'json';
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

async function getAccessibleProjectIds(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
    select: { id: true, name: true },
  });
  return {
    ids: projects.map((item) => item.id),
    nameMap: new Map(projects.map((item) => [item.id, item.name])),
  };
}

function createBufferFromRows(
  rows: Record<string, unknown>[],
  format: ReportFormat,
  sheetName: string
): { contentType: string; extension: string; body: Buffer | string } {
  if (format === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      extension: 'json',
      body: JSON.stringify(rows, null, 2),
    };
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (format === 'html') {
    const html = XLSX.utils.sheet_to_html(worksheet);
    return {
      contentType: 'text/html; charset=utf-8',
      extension: 'html',
      body: html,
    };
  }

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      contentType: 'text/csv; charset=utf-8',
      extension: 'csv',
      body: csv,
    };
  }

  const binary = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });
  return {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    body: binary,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeInput = searchParams.get('type') || 'executions';
  const formatInput = searchParams.get('format') || 'xlsx';
  const startDate = parseDate(searchParams.get('startDate'));
  const endDate = parseDate(searchParams.get('endDate'));

  if (!isReportType(typeInput)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (!isReportFormat(formatInput)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  const { ids: projectIds, nameMap } = await getAccessibleProjectIds(session.user.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ error: 'No accessible projects' }, { status: 403 });
  }

  const timeWhere =
    startDate || endDate
      ? {
          gte: startDate || undefined,
          lte: endDate || undefined,
        }
      : undefined;

  let rows: Record<string, unknown>[] = [];

  if (typeInput === 'executions') {
    const runs = await prisma.run.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: timeWhere,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        totalCount: true,
        passedCount: true,
        failedCount: true,
        skippedCount: true,
        duration: true,
        createdAt: true,
        projectId: true,
      },
    });
    rows = runs.map((run) => ({
      id: run.id,
      project: nameMap.get(run.projectId) || run.projectId,
      name: run.name,
      status: run.status,
      type: run.type,
      totalCount: run.totalCount,
      passedCount: run.passedCount,
      failedCount: run.failedCount,
      skippedCount: run.skippedCount,
      duration: run.duration || 0,
      createdAt: run.createdAt.toISOString(),
    }));
  } else if (typeInput === 'bugs') {
    const issues = await prisma.issue.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: timeWhere,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        severity: true,
        status: true,
        priority: true,
        createdAt: true,
        projectId: true,
      },
    });
    rows = issues.map((issue) => ({
      id: issue.id,
      project: nameMap.get(issue.projectId) || issue.projectId,
      title: issue.title,
      type: issue.type,
      severity: issue.severity,
      priority: issue.priority,
      status: issue.status,
      createdAt: issue.createdAt.toISOString(),
    }));
  } else {
    const tests = await prisma.test.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: timeWhere,
        status: { not: 'ARCHIVED' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        priority: true,
        source: true,
        createdAt: true,
        projectId: true,
      },
    });
    rows = tests.map((test) => ({
      id: test.id,
      project: nameMap.get(test.projectId) || test.projectId,
      name: test.name,
      type: test.type,
      status: test.status,
      priority: test.priority,
      source: test.source,
      createdAt: test.createdAt.toISOString(),
    }));
  }

  const payload = createBufferFromRows(rows, formatInput, typeInput);
  const filename = `report-${typeInput}-${new Date().toISOString().slice(0, 10)}.${payload.extension}`;

  return new NextResponse(payload.body as BodyInit, {
    headers: {
      'Content-Type': payload.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
