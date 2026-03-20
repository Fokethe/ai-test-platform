import { NextRequest } from 'next/server';
import { createdResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await params;
    const sourceRun = await prisma.run.findUnique({
      where: { id },
      include: {
        executions: {
          select: { testId: true },
        },
      },
    });

    if (!sourceRun) {
      return errors.notFound('run');
    }
    if (!sourceRun.projectId) {
      return errors.badRequest('Run has no projectId');
    }

    const canAccessProject = await hasProjectAccess(session.user.id, sourceRun.projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }

    const testIds = Array.from(new Set(sourceRun.executions.map((item) => item.testId)));
    if (testIds.length === 0) {
      return errors.badRequest('Run has no executions to rerun');
    }

    const rerun = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.run.create({
        data: {
          name: `${sourceRun.name} (Rerun)`,
          description: sourceRun.description,
          projectId: sourceRun.projectId,
          createdBy: session.user.id,
          type: sourceRun.type,
          status: 'RUNNING',
          totalCount: testIds.length,
          passedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          startedAt: new Date(),
        },
      });

      await tx.execution.createMany({
        data: testIds.map((testId) => ({
          runId: createdRun.id,
          testId,
          status: 'PENDING',
        })),
      });

      return createdRun;
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: 'RUN_RERUN_TRIGGERED',
      target: 'RUN',
      targetId: rerun.id,
      projectId: sourceRun.projectId,
      metadata: {
        sourceRunId: id,
        testCount: testIds.length,
      },
    });

    return createdResponse(rerun);
  } catch (error) {
    console.error('Rerun run error:', error);
    return errorResponse('Failed to create rerun', 500);
  }
}
