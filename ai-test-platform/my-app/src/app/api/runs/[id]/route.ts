import { NextRequest } from 'next/server';
import { RunStatus } from '@prisma/client';
import { errorResponse, errors, successResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_RUN_STATUSES: RunStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

async function ensureRunAccess(userId: string, runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      id: true,
      projectId: true,
      createdBy: true,
      startedAt: true,
    },
  });

  if (!run) {
    return { run: null, response: errors.notFound('run') };
  }

  if (run.projectId) {
    const canAccessProject = await hasProjectAccess(userId, run.projectId);
    if (!canAccessProject) {
      return { run: null, response: errors.forbidden() };
    }
  } else if (run.createdBy !== userId) {
    return { run: null, response: errors.forbidden() };
  }

  return { run, response: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const access = await ensureRunAccess(session.user.id, id);
    if (access.response) {
      return access.response;
    }

    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        executions: {
          orderBy: { createdAt: 'asc' },
          include: {
            test: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        issues: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!run) {
      return errors.notFound('run');
    }

    const executions = run.executions ?? [];
    const stats = {
      total: executions.length,
      passed: executions.filter((item) => item.status === 'PASSED').length,
      failed: executions.filter((item) => item.status === 'FAILED' || item.status === 'ERROR').length,
      skipped: executions.filter((item) => item.status === 'SKIPPED').length,
      running: executions.filter((item) => item.status === 'RUNNING').length,
      pending: executions.filter((item) => item.status === 'PENDING').length,
      error: executions.filter((item) => item.status === 'ERROR').length,
    };

    return successResponse({
      ...run,
      stats,
      passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
    });
  } catch (error) {
    console.error('Get run error:', error);
    return errorResponse('Failed to fetch run detail', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const access = await ensureRunAccess(session.user.id, id);
    if (access.response) {
      return access.response;
    }

    let body: { status?: unknown; name?: unknown; description?: unknown };
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('Invalid JSON body');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const description = typeof body.description === 'string' ? body.description.trim() : undefined;
    const status =
      typeof body.status === 'string' && ALLOWED_RUN_STATUSES.includes(body.status as RunStatus)
        ? (body.status as RunStatus)
        : undefined;

    if (typeof body.status === 'string' && !status) {
      return errors.badRequest('Invalid run status');
    }

    const now = new Date();
    const nextData: {
      name?: string;
      description?: string;
      status?: RunStatus;
      startedAt?: Date;
      completedAt?: Date | null;
    } = {};

    if (name !== undefined) {
      nextData.name = name;
    }
    if (description !== undefined) {
      nextData.description = description;
    }
    if (status) {
      nextData.status = status;
      if (status === 'RUNNING' && !access.run?.startedAt) {
        nextData.startedAt = now;
      }
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        nextData.completedAt = now;
      }
      if (status === 'PENDING' || status === 'RUNNING') {
        nextData.completedAt = null;
      }
    }

    const updated = await prisma.run.update({
      where: { id },
      data: nextData,
    });

    await writeAuditLog({
      actorId: session.user.id,
      action: 'RUN_UPDATED',
      target: 'RUN',
      targetId: id,
      projectId: updated.projectId ?? access.run?.projectId ?? undefined,
      metadata: {
        status: updated.status,
        hasNameUpdate: name !== undefined,
        hasDescriptionUpdate: description !== undefined,
      },
    });

    return successResponse(updated, 'Run updated');
  } catch (error) {
    console.error('Update run error:', error);
    return errorResponse('Failed to update run', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const access = await ensureRunAccess(session.user.id, id);
    if (access.response) {
      return access.response;
    }

    await prisma.run.delete({ where: { id } });
    return successResponse(null, 'Run deleted');
  } catch (error) {
    console.error('Delete run error:', error);
    return errorResponse('Failed to delete run', 500);
  }
}
