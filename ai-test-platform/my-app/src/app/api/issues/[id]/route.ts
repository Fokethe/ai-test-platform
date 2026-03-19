import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(['BUG', 'TASK', 'IMPROVEMENT', 'QUESTION']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.string().max(20).optional(),
  assigneeId: z.string().nullable().optional(),
  resolution: z.string().max(200).nullable().optional(),
});

async function loadIssue(id: string) {
  return prisma.issue.findUnique({
    where: { id },
    include: {
      reporter: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      test: {
        select: { id: true, name: true, type: true },
      },
      run: {
        select: { id: true, name: true, status: true },
      },
      execution: {
        select: { id: true, status: true, errorMessage: true },
      },
      project: {
        select: { id: true, name: true },
      },
    },
  });
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
  const issue = await loadIssue(id);
  if (!issue) {
    return errors.notFound('Issue');
  }

  const canAccess = await hasProjectAccess(session.user.id, issue.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  return successResponse(issue);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const { id } = await params;
  const existing = await prisma.issue.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      status: true,
      resolvedAt: true,
    },
  });
  if (!existing) {
    return errors.notFound('Issue');
  }

  const canAccess = await hasProjectAccess(session.user.id, existing.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const nextStatus = parsed.data.status || existing.status;
  const updated = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        severity: parsed.data.severity,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId,
        resolution: parsed.data.resolution,
        resolvedAt:
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? new Date()
            : existing.resolvedAt,
      },
    });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await tx.issueLifecycleEvent.create({
        data: {
          issueId: id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          actorId: session.user.id,
          note: 'updated_via_issue_put',
        },
      });
    }

    return issue;
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'ISSUE_UPDATED',
    target: 'ISSUE',
    targetId: id,
    projectId: existing.projectId,
    metadata: {
      fromStatus: existing.status,
      toStatus: parsed.data.status,
    },
  });

  return successResponse(updated, 'Issue updated');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const existing = await prisma.issue.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
    },
  });
  if (!existing) {
    return errors.notFound('Issue');
  }

  const canAccess = await hasProjectAccess(session.user.id, existing.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  await prisma.issue.delete({
    where: { id },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'ISSUE_DELETED',
    target: 'ISSUE',
    targetId: id,
    projectId: existing.projectId,
  });

  return successResponse(null, 'Issue deleted');
}
