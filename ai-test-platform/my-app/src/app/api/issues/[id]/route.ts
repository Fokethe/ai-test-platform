import { NextRequest } from 'next/server';
import { IssueStatus, Prisma } from '@prisma/client';
import { parseJsonBody } from '@/lib/api-handler';
import { errorResponse, errors, successResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

const ALLOWED_ISSUE_STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['IN_PROGRESS'],
};

type UpdateIssueBody = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  severity?: unknown;
  status?: unknown;
  priority?: unknown;
  assigneeId?: unknown;
  resolution?: unknown;
  runId?: unknown;
  testId?: unknown;
};

type IssueAccessResult =
  | {
      issue: {
        id: string;
        projectId: string;
        status: IssueStatus;
        resolvedAt: Date | null;
      };
      response: null;
    }
  | {
      issue: null;
      response: ReturnType<typeof errors.notFound> | ReturnType<typeof errors.forbidden>;
    };

type IssueUpdateData = {
  title?: string;
  description?: string | null;
  type?: string;
  severity?: string;
  status?: IssueStatus;
  priority?: string;
  assigneeId?: string | null;
  resolution?: string | null;
  runId?: string | null;
  testId?: string | null;
  resolvedAt?: Date | null;
  updatedAt: Date;
};

type IssueUpdatePreparation =
  | { updateData: IssueUpdateData; response: null }
  | { updateData: null; response: Response };

async function ensureIssueAccess(userId: string, issueId: string): Promise<IssueAccessResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      projectId: true,
      status: true,
      resolvedAt: true,
    },
  });

  if (!issue) {
    return { issue: null, response: errors.notFound('issue') };
  }

  const canAccessProject = await hasProjectAccess(userId, issue.projectId);
  if (!canAccessProject) {
    return { issue: null, response: errors.forbidden() };
  }

  return { issue, response: null };
}

function parseRequestedStatus(value: unknown) {
  if (value === undefined) {
    return { status: undefined as IssueStatus | undefined, response: null };
  }
  if (typeof value !== 'string') {
    return { status: undefined, response: errors.badRequest('Invalid issue status') };
  }
  if (!ALLOWED_ISSUE_STATUSES.includes(value as IssueStatus)) {
    return { status: undefined, response: errors.badRequest('Invalid issue status') };
  }
  return { status: value as IssueStatus, response: null };
}

function validateStatusTransition(currentStatus: IssueStatus, nextStatus: IssueStatus | undefined) {
  if (!nextStatus || nextStatus === currentStatus) {
    return null;
  }
  const allowedTransitions = ISSUE_STATUS_TRANSITIONS[currentStatus];
  if (allowedTransitions.includes(nextStatus)) {
    return null;
  }
  return errors.badRequest(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
}

function assignTrimmedString(target: IssueUpdateData, key: 'title' | 'description', value: unknown) {
  if (typeof value !== 'string') {
    return;
  }
  if (key === 'title') {
    target.title = value.trim();
    return;
  }
  target.description = value.trim();
}

function assignNullableDescription(target: IssueUpdateData, value: unknown) {
  if (value === null) {
    target.description = null;
  }
}

function assignString(target: IssueUpdateData, key: 'type' | 'severity' | 'priority', value: unknown) {
  if (typeof value === 'string') {
    target[key] = value;
  }
}

function assignNullableString(
  target: IssueUpdateData,
  key: 'assigneeId' | 'resolution' | 'runId' | 'testId',
  value: unknown
) {
  if (typeof value === 'string' || value === null) {
    target[key] = value;
  }
}

function applyStatusUpdate(
  target: IssueUpdateData,
  nextStatus: IssueStatus | undefined,
  previousResolvedAt: Date | null
) {
  if (!nextStatus) {
    return;
  }

  target.status = nextStatus;
  if (nextStatus === 'RESOLVED' || nextStatus === 'CLOSED') {
    target.resolvedAt = previousResolvedAt ?? new Date();
    return;
  }
  target.resolvedAt = null;
}

function buildIssueUpdateData(body: UpdateIssueBody, status: IssueStatus | undefined, resolvedAt: Date | null) {
  const updateData: IssueUpdateData = {
    updatedAt: new Date(),
  };

  assignTrimmedString(updateData, 'title', body.title);
  assignTrimmedString(updateData, 'description', body.description);
  assignNullableDescription(updateData, body.description);
  assignString(updateData, 'type', body.type);
  assignString(updateData, 'severity', body.severity);
  assignString(updateData, 'priority', body.priority);
  assignNullableString(updateData, 'assigneeId', body.assigneeId);
  assignNullableString(updateData, 'resolution', body.resolution);
  assignNullableString(updateData, 'runId', body.runId);
  assignNullableString(updateData, 'testId', body.testId);
  applyStatusUpdate(updateData, status, resolvedAt);

  return updateData;
}

async function prepareIssueUpdate(
  request: NextRequest,
  userId: string,
  issueId: string
): Promise<IssueUpdatePreparation> {
  const access = await ensureIssueAccess(userId, issueId);
  if (access.response) {
    return { updateData: null, response: access.response };
  }
  if (!access.issue) {
    return { updateData: null, response: errors.notFound('issue') };
  }

  const parseResult = await parseJsonBody<UpdateIssueBody>(request);
  if (!parseResult.success) {
    return { updateData: null, response: parseResult.error };
  }

  const statusResult = parseRequestedStatus(parseResult.data.status);
  if (statusResult.response) {
    return { updateData: null, response: statusResult.response };
  }

  const transitionError = validateStatusTransition(access.issue.status, statusResult.status);
  if (transitionError) {
    return { updateData: null, response: transitionError };
  }

  return {
    updateData: buildIssueUpdateData(
      parseResult.data,
      statusResult.status,
      access.issue.resolvedAt
    ),
    response: null,
  };
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

    const access = await ensureIssueAccess(session.user.id, id);
    if (access.response) {
      return access.response;
    }

    const issue = await prisma.issue.findUnique({
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
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!issue) {
      return errors.notFound('issue');
    }

    return successResponse(issue);
  } catch (requestError) {
    console.error('Get issue error:', requestError);
    return errorResponse('Failed to fetch issue detail', 500);
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

    const preparation = await prepareIssueUpdate(request, session.user.id, id);
    if (preparation.response || !preparation.updateData) {
      return preparation.response;
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: preparation.updateData as Prisma.IssueUncheckedUpdateInput,
    });

    return successResponse(updatedIssue, 'Issue updated');
  } catch (requestError) {
    console.error('Update issue error:', requestError);
    return errorResponse('Failed to update issue', 500);
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

    const access = await ensureIssueAccess(session.user.id, id);
    if (access.response) {
      return access.response;
    }

    await prisma.issue.delete({ where: { id } });
    return successResponse(null, 'Issue deleted');
  } catch (requestError) {
    console.error('Delete issue error:', requestError);
    return errorResponse('Failed to delete issue', 500);
  }
}
