import { POST } from '../route';
import { auth } from '@/lib/auth';
import { workflowStore } from '../../start/route';
import { WorkflowStatus } from '@/lib/ai/langgraph/types';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../../start/route', () => ({
  workflowStore: new Map(),
}));

type StoreEntry = {
  state: {
    status: WorkflowStatus;
    generatedCases?: Array<{ id: string; title: string; priority: string }>;
    reviewedCases?: Array<{ id: string; title: string; priority: string }>;
    reviewDecision?: 'approve' | 'edit' | 'regenerate';
    reviewComments?: string;
    retryCount: number;
    error?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

function seedEntry(workflowId: string, entry: StoreEntry) {
  (workflowStore as Map<string, StoreEntry>).set(workflowId, entry);
}

describe('POST /api/ai/workflow/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (workflowStore as Map<string, StoreEntry>).clear();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/ai/workflow/review', {
        method: 'POST',
        body: JSON.stringify({ workflowId: 'wf-1', decision: 'approve' }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('applies approve decision with shared review logic', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    seedEntry('wf-1', {
      state: {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'c-1', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedAt: new Date('2026-03-20T00:00:00.000Z'),
      userId: 'user-1',
    });

    const response = await POST(
      new Request('http://localhost/api/ai/workflow/review', {
        method: 'POST',
        body: JSON.stringify({ workflowId: 'wf-1', decision: 'approve' }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.status).toBe(WorkflowStatus.COMPLETED);
    expect((workflowStore as Map<string, StoreEntry>).get('wf-1')?.state.reviewDecision).toBe(
      'approve'
    );
  });

  it('supports reject decision for compatibility with /api/review', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    seedEntry('wf-2', {
      state: {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'c-2', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedAt: new Date('2026-03-20T00:00:00.000Z'),
      userId: 'user-1',
    });

    const response = await POST(
      new Request('http://localhost/api/ai/workflow/review', {
        method: 'POST',
        body: JSON.stringify({
          workflowId: 'wf-2',
          decision: 'reject',
          comments: 'Need more edge cases',
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect((workflowStore as Map<string, StoreEntry>).get('wf-2')?.state.status).toBe(
      WorkflowStatus.ERROR
    );
    expect((workflowStore as Map<string, StoreEntry>).get('wf-2')?.state.error).toContain(
      'Need more edge cases'
    );
  });
});
