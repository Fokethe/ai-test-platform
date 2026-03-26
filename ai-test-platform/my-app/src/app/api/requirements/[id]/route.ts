import { NextRequest } from 'next/server';
import { RequirementParser } from '@/lib/ai/agents/requirement-parser';
import { errors, successResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { groupTestPointsByFeature, type RequirementTestPointRecord } from '@/lib/requirements/ingestion';
import { safeParseDbField } from '@/lib/utils/safe-json-parser';

function normalizePriority(priority: unknown): 'P0' | 'P1' | 'P2' | 'P3' {
  if (priority === 'P0' || priority === 'P1' || priority === 'P2' || priority === 'P3') {
    return priority;
  }
  return 'P1';
}

async function getRequirementWithAccess(id: string, userId: string) {
  const requirement = await prisma.aiRequirement.findUnique({
    where: { id },
  });

  if (!requirement) {
    return { requirement: null, error: errors.notFound('Requirement') as Response };
  }

  const canAccessProject = await hasProjectAccess(userId, requirement.projectId);
  if (!canAccessProject) {
    return { requirement: null, error: errors.forbidden() as Response };
  }

  return { requirement, error: null as Response | null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await params;
    if (!id) {
      return errors.badRequest('requirement id is required');
    }

    const requirement = await prisma.aiRequirement.findUnique({
      where: { id },
      include: {
        testPoints: {
          orderBy: { order: 'asc' },
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

    const project = await prisma.project.findUnique({
      where: { id: requirement.projectId },
      select: { id: true, name: true },
    });

    const normalizedTestPoints: RequirementTestPointRecord[] = requirement.testPoints.map(
      (point, index) => ({
        id: point.id,
        name: point.name,
        description: point.description,
        priority: normalizePriority(point.priority),
        relatedFeature: point.relatedFeature || 'General',
        order: typeof point.order === 'number' ? point.order : index,
      })
    );

    const linkedTests = await prisma.test.findMany({
      where: {
        requirementId: id,
        projectId: requirement.projectId,
        status: { not: 'ARCHIVED' },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            executions: true,
            issues: true,
          },
        },
      },
    });

    const totalExecutions = linkedTests.reduce((sum, item) => sum + item._count.executions, 0);

    return successResponse({
      ...requirement,
      fileName: requirement.filename,
      fileType: requirement.type,
      status: 'COMPLETED',
      features: safeParseDbField<string[]>(requirement.features, []),
      businessRules: safeParseDbField<unknown[]>(requirement.businessRules, []),
      testPoints: normalizedTestPoints,
      testPointGroups: groupTestPointsByFeature(normalizedTestPoints),
      isConfirmed: !!requirement.confirmedAt,
      traceability: {
        requirementId: requirement.id,
        projectId: requirement.projectId,
        linkedTests: linkedTests.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          status: item.status,
          source: item.source,
          executionCount: item._count.executions,
          issueCount: item._count.issues,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        summary: {
          linkedTestCount: linkedTests.length,
          totalExecutionCount: totalExecutions,
        },
      },
      project,
    });
  } catch (error) {
    console.error('Failed to fetch requirement detail:', error);
    return errors.internalError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await getRequirementWithAccess(id, session.user.id);
  if (access.error || !access.requirement) {
    return access.error;
  }

  let body: { title?: unknown; content?: unknown };
  try {
    body = (await request.json()) as { title?: unknown; content?: unknown };
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  const patch: {
    title?: string;
    content?: string;
    rawText?: string;
    size?: number;
    features?: string;
    businessRules?: string;
  } = {};

  if (title) {
    patch.title = title;
  }

  if (content) {
    const parser = new RequirementParser();
    try {
      const parsed = await parser.parse(content);
      patch.content = content;
      patch.rawText = content;
      patch.size = Buffer.byteLength(content, 'utf-8');
      patch.features = JSON.stringify(parsed.features || []);
      patch.businessRules = JSON.stringify(parsed.businessRules || []);
    } catch (error) {
      return errors.badRequest(
        error instanceof Error ? error.message : 'Failed to parse updated requirement'
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return errors.badRequest('No fields to update');
  }

  const updated = await prisma.aiRequirement.update({
    where: { id },
    data: patch,
    include: {
      testPoints: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return successResponse(updated, 'Requirement updated');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const access = await getRequirementWithAccess(id, session.user.id);
  if (access.error || !access.requirement) {
    return access.error;
  }

  await prisma.aiRequirement.delete({
    where: { id },
  });

  return successResponse({ deleted: true, id }, 'Requirement deleted');
}
