/**
 * Review Queue API (compat layer)
 * Legacy /api/review endpoint backed by in-memory AI workflow store.
 */

import { NextRequest } from 'next/server';
import { GeneratedTestCase, WorkflowStatus } from '@/lib/ai/langgraph/types';
import { auth } from '@/lib/auth';
import { buildQueryParams, parseJsonBody } from '@/lib/api-handler';
import {
  buildMeta,
  createdResponse,
  errors,
  listResponse,
  successResponse,
} from '@/lib/api-response';
import { workflowStore } from '@/app/api/ai/workflow/start/route';
import {
  applyWorkflowReviewDecision,
  normalizeEditedCases,
  WorkflowReviewDecision,
} from '@/lib/review/workflow-review';

type ReviewListStatus = 'all' | 'pending' | 'approved' | 'rejected';
type ReviewPriority = 'high' | 'medium' | 'low';

type ReviewItem = {
  id: string;
  workflowId: string;
  type: 'testcase';
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: Exclude<ReviewListStatus, 'all'>;
  priority: ReviewPriority;
  retryCount: number;
  generatedCount: number;
  updatedAt: string;
};

type SubmitReviewBody = {
  workflowId?: unknown;
};

type DecideReviewBody = {
  workflowId?: unknown;
  decision?: unknown;
  comments?: unknown;
  editedCases?: unknown;
};

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function parseReviewListStatus(value: string): ReviewListStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return 'all';
}

function parseReviewDecision(value: unknown): WorkflowReviewDecision | null {
  if (value === 'approve' || value === 'edit' || value === 'regenerate' || value === 'reject') {
    return value;
  }
  return null;
}

function deriveReviewStatus(state: {
  status: WorkflowStatus;
  reviewDecision?: 'approve' | 'regenerate' | 'edit';
}): ReviewItem['status'] {
  if (state.status === WorkflowStatus.REVIEWING) {
    return 'pending';
  }
  if (state.status === WorkflowStatus.ERROR) {
    return 'rejected';
  }
  if (state.status === WorkflowStatus.COMPLETED) {
    return state.reviewDecision === 'regenerate' ? 'rejected' : 'approved';
  }
  return 'pending';
}

function derivePriority(cases: GeneratedTestCase[]): ReviewPriority {
  const priorities = new Set(cases.map((item) => item.priority.toUpperCase()));
  if (priorities.has('P0') || priorities.has('HIGH') || priorities.has('CRITICAL')) {
    return 'high';
  }
  if (priorities.has('P1') || priorities.has('MEDIUM')) {
    return 'medium';
  }
  return 'low';
}

function toReviewItem(
  workflowId: string,
  entry: {
    state: {
      status: WorkflowStatus;
      reviewDecision?: 'approve' | 'regenerate' | 'edit';
      generatedCases?: GeneratedTestCase[];
      requirementText?: string;
      document?: { title?: string };
      retryCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
  },
  submittedBy: string
): ReviewItem {
  const generatedCases = entry.state.generatedCases ?? [];
  const title =
    entry.state.document?.title ||
    entry.state.requirementText?.slice(0, 80) ||
    `Workflow ${workflowId}`;

  return {
    id: workflowId,
    workflowId,
    type: 'testcase',
    title,
    submittedBy,
    submittedAt: entry.createdAt.toISOString(),
    status: deriveReviewStatus(entry.state),
    priority: derivePriority(generatedCases),
    retryCount: entry.state.retryCount ?? 0,
    generatedCount: generatedCases.length,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function listUserReviewItems(userId: string, submittedBy: string): ReviewItem[] {
  return Array.from(workflowStore.entries())
    .filter(([, entry]) => entry.userId === userId)
    .map(([workflowId, entry]) => toReviewItem(workflowId, entry, submittedBy))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function findAccessibleWorkflow(workflowId: string, userId: string) {
  const entry = workflowStore.get(workflowId);
  if (!entry) {
    return { entry: null, response: errors.notFound('workflow') };
  }
  if (entry.userId !== userId) {
    return { entry: null, response: errors.forbidden() };
  }
  return { entry, response: null as Response | null };
}

// GET /api/review - get review queue items
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = parseReviewListStatus(normalizeText(searchParams.get('status')));
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);
    const submittedBy = session.user.name || session.user.email || session.user.id;

    const allItems = listUserReviewItems(session.user.id, submittedBy);
    const filtered =
      statusFilter === 'all' ? allItems : allItems.filter((item) => item.status === statusFilter);
    const paginated = filtered.slice(skip, skip + take);

    return listResponse(paginated, buildMeta(filtered.length, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch review queue:', error);
    return errors.internalError();
  }
}

// POST /api/review - submit workflow to review queue
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<SubmitReviewBody>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const workflowId = normalizeText(parseResult.data.workflowId);
    if (!workflowId) {
      return errors.badRequest('workflowId is required');
    }

    const access = findAccessibleWorkflow(workflowId, session.user.id);
    if (access.response) {
      return access.response;
    }
    if (!access.entry) {
      return errors.notFound('workflow');
    }

    if (
      access.entry.state.status === WorkflowStatus.COMPLETED ||
      access.entry.state.status === WorkflowStatus.ERROR
    ) {
      return errors.conflict('workflow is already finalized');
    }

    access.entry.state.status = WorkflowStatus.REVIEWING;
    access.entry.updatedAt = new Date();

    const item = toReviewItem(workflowId, access.entry, session.user.name || session.user.id);
    return createdResponse(item);
  } catch (error) {
    console.error('Failed to submit review:', error);
    return errors.internalError();
  }
}

// PUT /api/review - decide review result
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<DecideReviewBody>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const workflowId = normalizeText(parseResult.data.workflowId);
    const decision = parseReviewDecision(parseResult.data.decision);
    const comments = normalizeText(parseResult.data.comments) || undefined;
    const editedCases = normalizeEditedCases(parseResult.data.editedCases);

    if (!workflowId) {
      return errors.badRequest('workflowId is required');
    }
    if (!decision) {
      return errors.badRequest('decision must be one of approve/edit/regenerate/reject');
    }

    const access = findAccessibleWorkflow(workflowId, session.user.id);
    if (access.response) {
      return access.response;
    }
    if (!access.entry) {
      return errors.notFound('workflow');
    }

    if (access.entry.state.status !== WorkflowStatus.REVIEWING) {
      return errors.badRequest('workflow is not in reviewing status');
    }

    const result = applyWorkflowReviewDecision(access.entry, decision, {
      comments,
      editedCases,
    });

    const item = toReviewItem(workflowId, access.entry, session.user.name || session.user.id);
    return successResponse({
      workflowId,
      decision,
      status: result.status,
      item,
      reviewedCases: result.reviewedCases,
      retryCount: result.retryCount,
      error: result.error,
    });
  } catch (error) {
    console.error('Failed to decide review:', error);
    return errors.internalError();
  }
}
