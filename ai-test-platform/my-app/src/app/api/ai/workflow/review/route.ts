import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { workflowStore } from '../start/route';
import { auth } from '@/lib/auth';
import {
  applyWorkflowReviewDecision,
  normalizeEditedCases,
  WorkflowReviewDecision,
} from '@/lib/review/workflow-review';
import { WorkflowStatus } from '@/lib/ai/langgraph/types';

const ReviewDecisionSchema = z.object({
  workflowId: z.string().min(1),
  decision: z.enum(['approve', 'edit', 'regenerate', 'reject']),
  comments: z.string().optional(),
  editedCases: z.unknown().optional(),
});

function getDecisionMessage(decision: WorkflowReviewDecision, completed: boolean): string {
  if (!completed && decision === 'regenerate') {
    return 'Regeneration requested';
  }

  if (decision === 'approve') {
    return 'Review approved';
  }
  if (decision === 'edit') {
    return 'Edited cases saved';
  }
  if (decision === 'regenerate') {
    return 'Reached max retries, kept latest generated cases';
  }
  return 'Review rejected';
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = ReviewDecisionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: validated.error.issues },
        { status: 400 }
      );
    }

    const { workflowId, decision, comments, editedCases } = validated.data;
    const storeEntry = workflowStore.get(workflowId);

    if (!storeEntry) {
      return NextResponse.json({ error: 'Workflow not found or expired' }, { status: 404 });
    }

    if (storeEntry.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (storeEntry.state.status !== WorkflowStatus.REVIEWING) {
      return NextResponse.json(
        {
          error: 'Workflow is not in reviewing status',
          currentStatus: storeEntry.state.status,
        },
        { status: 400 }
      );
    }

    const result = applyWorkflowReviewDecision(storeEntry, decision, {
      comments: comments?.trim() || undefined,
      editedCases: normalizeEditedCases(editedCases),
    });

    return NextResponse.json({
      code: 0,
      success: true,
      workflowId,
      decision,
      status: result.status,
      message: getDecisionMessage(decision, result.status === WorkflowStatus.COMPLETED),
      reviewedCases: result.reviewedCases,
      retryCount: result.retryCount,
      error: result.error,
    });
  } catch (error) {
    console.error('Failed to submit workflow review decision:', error);
    return NextResponse.json(
      { error: 'Failed to submit review decision', message: (error as Error).message },
      { status: 500 }
    );
  }
}
