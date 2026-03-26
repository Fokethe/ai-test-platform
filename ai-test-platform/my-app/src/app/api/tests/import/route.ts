import * as XLSX from 'xlsx';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import {
  ensureProjectDefaultLegacyRequirement,
  resolveLegacyRequirementId,
} from '@/lib/requirements/legacy-bridge';

type ImportedCase = {
  name: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags: string[];
  steps: Array<{ order: number; action: string; expected?: string }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizePriority(value: unknown): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const normalized = normalizeText(value).toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
    case 'P0':
      return 'CRITICAL';
    case 'HIGH':
    case 'P1':
      return 'HIGH';
    case 'LOW':
    case 'P3':
      return 'LOW';
    case 'MEDIUM':
    case 'P2':
    default:
      return 'MEDIUM';
  }
}

function parseSteps(value: unknown): Array<{ order: number; action: string; expected?: string }> {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (typeof item === 'string') {
          const action = item.trim();
          if (!action) {
            return null;
          }
          return { order: index + 1, action };
        }
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          const action = normalizeText(record.action ?? record.step ?? record.content);
          if (!action) {
            return null;
          }
          return {
            order:
              typeof record.order === 'number' && Number.isFinite(record.order)
                ? Math.max(1, Math.floor(record.order))
                : index + 1,
            action,
            expected: normalizeText(record.expected ?? record.expectation),
          };
        }
        return null;
      })
      .filter((step): step is { order: number; action: string; expected?: string } => !!step);
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    try {
      return parseSteps(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({ order: index + 1, action: line }));
    }
  }

  return [];
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function readCsvRows(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });
    return row;
  });
}

function toImportedCase(row: Record<string, unknown>): ImportedCase | null {
  const name =
    normalizeText(row.name) ||
    normalizeText(row.title) ||
    normalizeText(row.名称) ||
    normalizeText(row.标题);

  if (!name) {
    return null;
  }

  const descriptionRaw =
    normalizeText(row.description) ||
    normalizeText(row.描述) ||
    normalizeText(row.precondition) ||
    normalizeText(row.前置条件);

  const steps = parseSteps(row.steps ?? row.步骤 ?? row.actions);

  return {
    name,
    description: descriptionRaw || null,
    priority: normalizePriority(row.priority ?? row.优先级),
    tags: parseTags(row.tags ?? row.标签),
    steps,
  };
}

async function parseUploadedFile(file: File): Promise<ImportedCase[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.toLowerCase();

  let rawRows: Array<Record<string, unknown>> = [];

  if (filename.endsWith('.json')) {
    const parsed = JSON.parse(buffer.toString('utf-8')) as unknown;
    if (Array.isArray(parsed)) {
      rawRows = parsed as Array<Record<string, unknown>>;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { testCases?: unknown[] }).testCases)
    ) {
      rawRows = (parsed as { testCases: Array<Record<string, unknown>> }).testCases;
    } else {
      throw new Error('JSON 内容格式无效');
    }
  } else if (filename.endsWith('.csv')) {
    rawRows = readCsvRows(buffer.toString('utf-8'));
  } else if (filename.endsWith('.xlsx')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      throw new Error('Excel 无可用工作表');
    }
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: '',
    });
  } else {
    throw new Error('仅支持 .xlsx / .json / .csv 文件');
  }

  const items = rawRows
    .map((row) => toImportedCase(row))
    .filter((item): item is ImportedCase => !!item)
    .slice(0, 500);

  if (items.length === 0) {
    throw new Error('未解析到有效测试用例');
  }

  return items;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: 'file is required' }, { status: 400 });
    }

    let projectId = normalizeText(formData.get('projectId'));
    if (projectId) {
      const allowed = await hasProjectAccess(session.user.id, projectId);
      if (!allowed) {
        return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { members: { some: { userId: session.user.id } } },
            { workspace: { members: { some: { userId: session.user.id } } } },
            { workspace: { ownerId: session.user.id } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!project) {
        return Response.json(
          { success: false, error: 'No accessible project found' },
          { status: 403 }
        );
      }
      projectId = project.id;
    }

    const rawRequirementId = normalizeText(formData.get('requirementId'));
    const requirementId =
      (await resolveLegacyRequirementId({ projectId, requirementId: rawRequirementId })) ||
      (await ensureProjectDefaultLegacyRequirement(projectId, '导入测试用例默认需求'));

    const importedCases = await parseUploadedFile(file);

    const created = await prisma.$transaction(
      importedCases.map((item) =>
        prisma.test.create({
          data: {
            name: item.name,
            description: item.description,
            type: 'CASE',
            status: 'DRAFT',
            priority: item.priority,
            tags: item.tags.length > 0 ? JSON.stringify(item.tags) : null,
            content: item.steps.length > 0 ? JSON.stringify(item.steps) : null,
            source: 'IMPORTED',
            projectId,
            requirementId,
            createdBy: session.user.id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      )
    );

    return Response.json({
      success: true,
      data: {
        count: created.length,
        projectId,
        requirementId,
        ids: created.map((item) => item.id),
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导入失败',
      },
      { status: 400 }
    );
  }
}
