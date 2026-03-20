import { AgentState, GeneratedTestCase, WorkflowStatus } from '@/lib/ai/langgraph/types';

export type WorkflowStoreEntry = {
  state: AgentState;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export type WorkflowReviewDecision = 'approve' | 'edit' | 'regenerate' | 'reject';

type ApplyReviewOptions = {
  comments?: string;
  editedCases?: GeneratedTestCase[];
  maxRetries?: number;
};

export function normalizeEditedCases(value: unknown): GeneratedTestCase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is GeneratedTestCase =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).title === 'string'
  );
}

export function applyWorkflowReviewDecision(
  entry: WorkflowStoreEntry,
  decision: WorkflowReviewDecision,
  options: ApplyReviewOptions = {}
) {
  const { comments, editedCases = [], maxRetries = 3 } = options;

  entry.state.reviewComments = comments;

  if (decision === 'approve') {
    entry.state.reviewDecision = 'approve';
    entry.state.reviewedCases = entry.state.generatedCases;
    entry.state.status = WorkflowStatus.COMPLETED;
  } else if (decision === 'edit') {
    entry.state.reviewDecision = 'edit';
    entry.state.reviewedCases = editedCases.length > 0 ? editedCases : entry.state.generatedCases;
    entry.state.status = WorkflowStatus.COMPLETED;
  } else if (decision === 'regenerate') {
    if (entry.state.retryCount >= maxRetries) {
      entry.state.reviewDecision = 'regenerate';
      entry.state.reviewedCases = entry.state.generatedCases;
      entry.state.status = WorkflowStatus.COMPLETED;
      entry.state.error = entry.state.error || 'Reached max retry count, kept latest generated cases';
    } else {
      entry.state.retryCount += 1;
      entry.state.reviewDecision = undefined;
      entry.state.status = WorkflowStatus.GENERATING;
    }
  } else {
    entry.state.reviewedCases = [];
    entry.state.status = WorkflowStatus.ERROR;
    entry.state.error = comments || 'Rejected by reviewer';
  }

  entry.updatedAt = new Date();

  return {
    status: entry.state.status,
    reviewedCases: entry.state.reviewedCases ?? [],
    retryCount: entry.state.retryCount,
    error: entry.state.error,
  };
}
