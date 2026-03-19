import { NextRequest } from 'next/server';
import { errors, successResponse } from '@/lib/api-response';
import { parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string' && VALID_PRIORITIES.includes(value as Priority)) {
    return value as Priority;
  }
  return 'P1';
}

async function getRequirement(requirementId: string) {
  return prisma.aiRequirement.findUnique({
    where: { id: requirementId },
    select: { id: true, projectId: true },
  });
}

async function canAccessRequirement(requirementId: string, userId: string) {
  const requirement = await getRequirement(requirementId);
  if (!requirement) {
    return { requirement: null, error: errors.notFound('Requirement') };
  }

  const allowed = await hasProjectAccess(userId, requirement.projectId);
  if (!allowed) {
    return { requirement: null, error: errors.forbidden() };
  }

  return { requirement, error: null };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testPointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id, testPointId } = await params;
  const access = await canAccessRequirement(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const existing = await prisma.testPoint.findFirst({
    where: { id: testPointId, requirementId: id },
    select: { id: true },
  });
  if (!existing) {
    return errors.notFound('Test point');
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

  const patch: {
    name?: string;
    description?: string;
    priority?: Priority;
    relatedFeature?: string;
    order?: number;
  } = {};

  if (typeof parseResult.data.name === 'string') {
    const value = parseResult.data.name.trim();
    if (!value) {
      return errors.badRequest('name cannot be empty');
    }
    patch.name = value;
  }

  if (typeof parseResult.data.description === 'string') {
    patch.description = parseResult.data.description.trim();
  }

  if (parseResult.data.priority !== undefined) {
    patch.priority = normalizePriority(parseResult.data.priority);
  }

  if (typeof parseResult.data.relatedFeature === 'string') {
    patch.relatedFeature = parseResult.data.relatedFeature.trim() || 'General';
  }

  if (typeof parseResult.data.order === 'number' && Number.isFinite(parseResult.data.order)) {
    patch.order = Math.max(0, parseResult.data.order);
  }

  const result = await prisma.$transaction(async (tx) => {
    const point = await tx.testPoint.update({
      where: { id: testPointId },
      data: patch,
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
    'Test point updated'
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testPointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id, testPointId } = await params;
  const access = await canAccessRequirement(id, session.user.id);
  if (access.error) {
    return access.error;
  }

  const existing = await prisma.testPoint.findFirst({
    where: { id: testPointId, requirementId: id },
    select: { id: true },
  });
  if (!existing) {
    return errors.notFound('Test point');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.testPoint.delete({
      where: { id: testPointId },
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

    return { requirementVersion: requirement.version };
  });

  return successResponse(
    {
      id: testPointId,
      deleted: true,
      requirementVersion: result.requirementVersion,
    },
    'Test point deleted'
  );
}
