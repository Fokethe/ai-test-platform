import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { RequirementParser } from '@/lib/ai/agents/requirement-parser';
import { auth } from '@/lib/auth';
import { buildQueryParams } from '@/lib/api-handler';
import { buildMeta, errors, listResponse, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { groupTestPointsByFeature, persistRequirementIngestion } from '@/lib/requirements/ingestion';
import { safeParseDbField } from '@/lib/utils/safe-json-parser';

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeText(searchParams.get('projectId'));
  const search = normalizeText(searchParams.get('search'));
  const { page, pageSize, skip, take } = buildQueryParams(searchParams);

  const accessibleProjects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId: session.user.id } } },
        { workspace: { members: { some: { userId: session.user.id } } } },
        { workspace: { ownerId: session.user.id } },
      ],
    },
    select: { id: true, name: true },
  });
  const accessibleProjectIds = accessibleProjects.map((item) => item.id);
  const projectById = new Map(accessibleProjects.map((item) => [item.id, item]));

  if (accessibleProjectIds.length === 0) {
    return listResponse([], buildMeta(0, page, pageSize));
  }

  if (projectId && !accessibleProjectIds.includes(projectId)) {
    return errors.forbidden();
  }

  const where: Prisma.AiRequirementWhereInput = {
    projectId: {
      in: projectId ? [projectId] : accessibleProjectIds,
    },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { filename: { contains: search, mode: 'insensitive' } },
    ];
  }

  const total = await prisma.aiRequirement.count({ where });
  const requirements = await prisma.aiRequirement.findMany({
    where,
    skip,
    take,
    orderBy: { updatedAt: 'desc' },
    include: {
      testPoints: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          priority: true,
          relatedFeature: true,
          order: true,
        },
      },
    },
  });

  const normalized = requirements.map((item) => {
    const testPoints = item.testPoints.map((point, index) => ({
      id: point.id,
      name: point.name,
      description: point.description,
      priority:
        point.priority === 'P0' ||
        point.priority === 'P1' ||
        point.priority === 'P2' ||
        point.priority === 'P3'
          ? point.priority
          : 'P1',
      relatedFeature: point.relatedFeature || 'General',
      order: typeof point.order === 'number' ? point.order : index,
    }));

    return {
      ...item,
      fileName: item.filename,
      fileType: item.type,
      status: 'COMPLETED',
      features: safeParseDbField<string[]>(item.features, []),
      businessRules: safeParseDbField<unknown[]>(item.businessRules, []),
      testPointCount: testPoints.length,
      testPoints,
      testPointGroups: groupTestPointsByFeature(testPoints),
      isConfirmed: !!item.confirmedAt,
      project: projectById.get(item.projectId) ?? null,
    };
  });

  return listResponse(normalized, buildMeta(total, page, pageSize));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const projectId = normalizeText((body as { projectId?: unknown })?.projectId);
  const content = normalizeText((body as { content?: unknown })?.content);
  const titleInput = normalizeText((body as { title?: unknown })?.title);
  const filenameInput = normalizeText((body as { filename?: unknown })?.filename);

  if (!projectId) {
    return errors.badRequest('projectId is required');
  }

  if (!content) {
    return errors.badRequest('content is required');
  }

  const canAccessProject = await hasProjectAccess(session.user.id, projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const requirementParser = new RequirementParser();
  let parsedRequirement;
  try {
    parsedRequirement = await requirementParser.parse(content);
  } catch (error) {
    return errors.badRequest(
      error instanceof Error ? error.message : 'Failed to parse requirement content'
    );
  }

  const title =
    titleInput || parsedRequirement.features[0] || content.slice(0, 50) || 'Untitled Requirement';
  const filename = filenameInput || `pasted-requirement-${Date.now()}.txt`;

  try {
    const result = await persistRequirementIngestion({
      projectId,
      title,
      type: 'txt',
      filename,
      content,
      rawText: content,
      size: Buffer.byteLength(content, 'utf-8'),
      parsedRequirement,
      createdBy: session.user.id,
    });

    return successResponse(result, 'Requirement ingested');
  } catch (error) {
    console.error('Requirement ingestion failed:', error);
    return errors.internalError();
  }
}
