import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
} from '@/lib/api-response';
import { buildQueryParams, parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import {
  ensureProjectDefaultLegacyRequirement,
  resolveLegacyRequirementId,
} from '@/lib/requirements/legacy-bridge';

type TestType = 'CASE' | 'SUITE' | 'FOLDER';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'priority']);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeType(value: unknown): TestType | null {
  if (value === 'CASE' || value === 'SUITE' || value === 'FOLDER') {
    return value;
  }
  return null;
}

function parseTagsInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildAccessibleTestsScope(userId: string): Prisma.TestWhereInput {
  return {
    project: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = normalizeType(searchParams.get('type'));
    const projectId = normalizeText(searchParams.get('projectId'));
    const parentIdParam = searchParams.get('parentId');
    const search = normalizeText(searchParams.get('search'));
    const status = normalizeText(searchParams.get('status'));
    const priority = normalizeText(searchParams.get('priority'));
    const source = normalizeText(searchParams.get('source'));
    const tagsFilter = parseTagsInput(searchParams.get('tags'));
    const sort = normalizeText(searchParams.get('sort'));
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const andFilters: Prisma.TestWhereInput[] = [buildAccessibleTestsScope(session.user.id)];

    if (type) {
      andFilters.push({ type });
    }
    if (projectId) {
      andFilters.push({ projectId });
    }
    if (parentIdParam !== null) {
      andFilters.push({ parentId: parentIdParam || null });
    }
    if (status) {
      andFilters.push({ status });
    }
    if (priority) {
      andFilters.push({ priority });
    }
    if (source) {
      andFilters.push({ source });
    }
    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }
    if (tagsFilter.length > 0) {
      andFilters.push({
        OR: tagsFilter.map((tag) => ({
          tags: { contains: tag },
        })),
      });
    }

    const where: Prisma.TestWhereInput = { AND: andFilters };
    const total = await prisma.test.count({ where });

    const orderBy: Prisma.TestOrderByWithRelationInput = ALLOWED_SORT_FIELDS.has(sort)
      ? ({ [sort]: order } as Prisma.TestOrderByWithRelationInput)
      : { updatedAt: 'desc' };

    const tests = await prisma.test.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        customFieldValues: {
          include: {
            field: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    return listResponse(tests, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch tests:', error);
    return errorResponse('Failed to fetch tests', 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const parseResult = await parseJsonBody<{
    name?: unknown;
    description?: unknown;
    type?: unknown;
    content?: unknown;
    projectId?: unknown;
    parentId?: unknown;
    tags?: unknown;
    priority?: unknown;
    source?: unknown;
    requirementId?: unknown;
    aiPrompt?: unknown;
    aiModel?: unknown;
  }>(request);

  if (!parseResult.success) {
    return parseResult.error;
  }

  const name = normalizeText(parseResult.data.name);
  const projectId = normalizeText(parseResult.data.projectId);
  const rawRequirementId = normalizeText(parseResult.data.requirementId);
  let requirementId = '';
  const description = normalizeText(parseResult.data.description) || null;
  const type = normalizeType(parseResult.data.type) || 'CASE';
  const parentId =
    typeof parseResult.data.parentId === 'string' ? parseResult.data.parentId.trim() || null : null;
  const priority = normalizeText(parseResult.data.priority) || 'MEDIUM';
  const source = normalizeText(parseResult.data.source) || 'MANUAL';
  const tags = parseTagsInput(parseResult.data.tags);

  if (!name || !projectId) {
    return errors.badRequest('name and projectId are required');
  }
  const canAccessProject = await hasProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  if (rawRequirementId) {
    const resolved = await resolveLegacyRequirementId({
      projectId,
      requirementId: rawRequirementId,
    });
    if (!resolved) {
      return errors.badRequest('requirementId is invalid for this project');
    }
    requirementId = resolved;
  } else {
    const fallbackRequirement = await prisma.requirement.findFirst({
      where: { page: { system: { projectId } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (fallbackRequirement?.id) {
      requirementId = fallbackRequirement.id;
    } else {
      try {
        requirementId = await ensureProjectDefaultLegacyRequirement(
          projectId,
          `${name} 默认需求`
        );
      } catch {
        return errors.badRequest('requirementId is required');
      }
    }
  }

  if (parentId) {
    const parent = await prisma.test.findFirst({
      where: { id: parentId, projectId },
      select: { id: true },
    });
    if (!parent) {
      return errors.badRequest('parentId is invalid for this project');
    }
  }

  const contentValue =
    parseResult.data.content === undefined || parseResult.data.content === null
      ? null
      : typeof parseResult.data.content === 'string'
      ? parseResult.data.content
      : JSON.stringify(parseResult.data.content);

  try {
    const test = await prisma.test.create({
      data: {
        name,
        description,
        type,
        content: contentValue,
        projectId,
        parentId,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        priority,
        source,
        requirementId,
        createdBy: session.user.id,
        aiPrompt:
          typeof parseResult.data.aiPrompt === 'string' ? parseResult.data.aiPrompt : null,
        aiModel: typeof parseResult.data.aiModel === 'string' ? parseResult.data.aiModel : null,
      },
    });

    return createdResponse(test);
  } catch (error) {
    console.error('Failed to create test:', error);
    return errorResponse('Failed to create test', 500);
  }
}

