import { NextRequest } from 'next/server';
import { errors, successResponse } from '@/lib/api-response';
import { parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { groupTestPointsByFeature } from '@/lib/requirements/ingestion';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string' && VALID_PRIORITIES.includes(value as Priority)) {
    return value as Priority;
  }
  return 'P1';
}

async function getRequirementForUser(requirementId: string, userId: string) {
  const requirement = await prisma.aiRequirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      projectId: true,
      version: true,
    },
  });

  if (!requirement) {
    return { requirement: null, error: errors.notFound('Requirement') };
  }

  const canAccessProject = await hasProjectAccess(userId, requirement.projectId);
  if (!canAccessProject) {
    return { requirement: null, error: errors.forbidden() };
  }

  return { requirement, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await getRequirementForUser(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const points = await prisma.testPoint.findMany({
    where: { requirementId: id },
    orderBy: { order: 'asc' },
  });

  const normalized = points.map((point, index) => ({
    id: point.id,
    name: point.name,
    description: point.description,
    priority: normalizePriority(point.priority),
    relatedFeature: point.relatedFeature || 'General',
    order: typeof point.order === 'number' ? point.order : index,
  }));

  return successResponse({
    requirementId: id,
    version: access.requirement!.version,
    testPoints: normalized,
    testPointGroups: groupTestPointsByFeature(normalized),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await getRequirementForUser(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const parseResult = await parseJsonBody<{
    name?: unknown;
    description?: unknown;
    priority?: unknown;
    relatedFeature?: unknown;
    order?: unknown;
  }>(request);
  if (!parseResult.success) {
    return parseResult.error;
  }

  const name =
    typeof parseResult.data.name === 'string' ? parseResult.data.name.trim() : '';
  if (!name) {
    return errors.badRequest('name is required');
  }

  const description =
    typeof parseResult.data.description === 'string' ? parseResult.data.description.trim() : '';
  const relatedFeature =
    typeof parseResult.data.relatedFeature === 'string' &&
    parseResult.data.relatedFeature.trim().length > 0
      ? parseResult.data.relatedFeature.trim()
      : 'General';

  const priority = normalizePriority(parseResult.data.priority);

  const maxOrder = await prisma.testPoint.aggregate({
    where: { requirementId: id },
    _max: { order: true },
  });

  const parsedOrder =
    typeof parseResult.data.order === 'number' && Number.isFinite(parseResult.data.order)
      ? parseResult.data.order
      : (maxOrder._max.order ?? -1) + 1;

  const result = await prisma.$transaction(async (tx) => {
    const point = await tx.testPoint.create({
      data: {
        name,
        description,
        priority,
        relatedFeature,
        order: Math.max(0, parsedOrder),
        requirementId: id,
      },
    });

    const requirement = await tx.aiRequirement.update({
      where: { id },
      data: {
        version: { increment: 1 },
        confirmedAt: null,
        confirmedBy: null,
      },
      select: { version: true },
    });

    return { point, requirementVersion: requirement.version };
  });

  return successResponse(
    {
      id: result.point.id,
      name: result.point.name,
      description: result.point.description,
      priority: normalizePriority(result.point.priority),
      relatedFeature: result.point.relatedFeature || 'General',
      order: result.point.order,
      requirementVersion: result.requirementVersion,
    },
    'Test point created'
  );
}
