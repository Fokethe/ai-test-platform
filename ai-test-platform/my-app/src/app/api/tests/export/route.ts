import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ExportFormat = 'xlsx' | 'csv' | 'json';
type TestType = 'CASE' | 'SUITE' | 'FOLDER';

function isFormat(value: string): value is ExportFormat {
  return value === 'xlsx' || value === 'csv' || value === 'json';
}

function isType(value: string): value is TestType {
  return value === 'CASE' || value === 'SUITE' || value === 'FOLDER';
}

function normalize(value: string | null) {
  return (value || '').trim();
}

function buildRows(items: Array<{
  id: string;
  name: string;
  type: string;
  status: string;
  priority: string;
  description: string | null;
  tags: string | null;
  updatedAt: Date;
  project: { name: string };
  _count: { executions: number };
}>) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    project: item.project.name,
    type: item.type,
    status: item.status,
    priority: item.priority,
    executionCount: item._count.executions,
    tags: item.tags || '',
    description: item.description || '',
    updatedAt: item.updatedAt.toISOString(),
  }));
}

function toPayload(
  rows: Record<string, unknown>[],
  format: ExportFormat
): { body: Buffer | string; contentType: string; ext: string } {
  if (format === 'json') {
    return {
      body: JSON.stringify(rows, null, 2),
      contentType: 'application/json; charset=utf-8',
      ext: 'json',
    };
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'tests');

  if (format === 'csv') {
    return {
      body: XLSX.utils.sheet_to_csv(worksheet),
      contentType: 'text/csv; charset=utf-8',
      ext: 'csv',
    };
  }

  return {
    body: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const formatInput = normalize(searchParams.get('format')) || 'xlsx';
  const typeInput = normalize(searchParams.get('type'));
  const search = normalize(searchParams.get('search'));

  if (!isFormat(formatInput)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }
  if (typeInput && !isType(typeInput)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const items = await prisma.test.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(typeInput ? { type: typeInput } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      project: {
        OR: [
          { members: { some: { userId: session.user.id } } },
          { workspace: { members: { some: { userId: session.user.id } } } },
          { workspace: { ownerId: session.user.id } },
        ],
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      priority: true,
      description: true,
      tags: true,
      updatedAt: true,
      project: {
        select: { name: true },
      },
      _count: {
        select: { executions: true },
      },
    },
  });

  const rows = buildRows(items);
  const payload = toPayload(rows, formatInput);
  const filename = `tests-export-${new Date().toISOString().slice(0, 10)}.${payload.ext}`;

  return new NextResponse(payload.body as BodyInit, {
    headers: {
      'Content-Type': payload.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
