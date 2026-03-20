import { NextRequest } from 'next/server';
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
