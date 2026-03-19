import { NextRequest } from 'next/server';
import { errors, successResponse } from '@/lib/api-response';
import { parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const requirement = await prisma.aiRequirement.findUnique({
    where: { id },
    include: {
      testPoints: {
        select: { id: true },
      },
    },
  });

  if (!requirement) {
    return errors.notFound('Requirement');
  }

  const canAccessProject = await hasProjectAccess(session.user.id, requirement.projectId);
  if (!canAccessProject) {
    return errors.forbidden();
  }

  const parseResult = await parseJsonBody<{
    testPointIds?: unknown;
    notes?: unknown;
  }>(request);
  if (!parseResult.success) {
    return parseResult.error;
  }

  const selectedIds = Array.isArray(parseResult.data.testPointIds)
    ? parseResult.data.testPointIds.filter((item): item is string => typeof item === 'string')
    : [];

  if (selectedIds.length > 0) {
    const validIds = new Set(requirement.testPoints.map((point) => point.id));
    const invalid = selectedIds.filter((item) => !validIds.has(item));
    if (invalid.length > 0) {
      return errors.badRequest('testPointIds contains invalid points');
    }
  }

  const now = new Date();
  const updated = await prisma.aiRequirement.update({
    where: { id },
    data: {
      version: { increment: 1 },
      confirmedAt: now,
      confirmedBy: session.user.id,
    },
    select: {
      id: true,
      version: true,
      confirmedAt: true,
      confirmedBy: true,
      updatedAt: true,
    },
  });

  await prisma.activity.create({
    data: {
      actorId: session.user.id,
      actorType: 'USER',
      action: 'REQUIREMENT_CONFIRM',
      target: 'AiRequirement',
      targetId: id,
      metadata: JSON.stringify({
        selectedTestPointIds: selectedIds,
        selectedCount: selectedIds.length,
        notes:
          typeof parseResult.data.notes === 'string' ? parseResult.data.notes.slice(0, 500) : '',
      }),
      projectId: requirement.projectId,
    },
  });

  return successResponse(
    {
      ...updated,
      isConfirmed: true,
      selectedTestPointCount: selectedIds.length || requirement.testPoints.length,
    },
    'Requirement confirmed'
  );
}
