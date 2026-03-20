import { GET, POST, PUT } from '../route';
import { WorkflowStatus } from '@/lib/ai/langgraph/types';
import { auth } from '@/lib/auth';
import { workflowStore } from '@/app/api/ai/workflow/start/route';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/app/api/ai/workflow/start/route', () => ({
  workflowStore: new Map(),
}));

type StoreEntry = {
  state: {
    status: WorkflowStatus;
    reviewDecision?: 'approve' | 'regenerate' | 'edit';
    reviewComments?: string;
    requirementText?: string;
    generatedCases?: Array<{ id: string; title: string; priority: string }>;
    reviewedCases?: Array<{ id: string; title: string; priority: string }>;
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

describe('GET /api/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (workflowStore as Map<string, StoreEntry>).clear();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/review') as never);

    expect(response.status).toBe(401);
  });

  it('returns filtered review queue for current user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', name: 'Alice' } });

    seedEntry('wf-1', {
      state: {
        status: WorkflowStatus.REVIEWING,
        requirementText: 'Login flow requirement',
        generatedCases: [{ id: 'c1', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedAt: new Date('2026-03-20T00:10:00.000Z'),
      userId: 'user-1',
    });

    seedEntry('wf-2', {
      state: {
        status: WorkflowStatus.COMPLETED,
        reviewDecision: 'approve',
        requirementText: 'Other requirement',
        generatedCases: [{ id: 'c2', title: 'case', priority: 'P2' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-19T00:00:00.000Z'),
      updatedAt: new Date('2026-03-19T00:10:00.000Z'),
      userId: 'user-1',
    });

    const response = await GET(
      new Request('http://localhost/api/review?status=pending&page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list).toHaveLength(1);
    expect(payload.data.list[0].workflowId).toBe('wf-1');
    expect(payload.data.list[0].status).toBe('pending');
  });
});

describe('POST /api/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (workflowStore as Map<string, StoreEntry>).clear();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', name: 'Alice' } });
  });

  it('moves workflow into reviewing status', async () => {
    seedEntry('wf-3', {
      state: {
        status: WorkflowStatus.GENERATING,
        generatedCases: [{ id: 'c3', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T01:00:00.000Z'),
      updatedAt: new Date('2026-03-20T01:00:00.000Z'),
      userId: 'user-1',
    });

    const response = await POST(
      new Request('http://localhost/api/review', {
        method: 'POST',
        body: JSON.stringify({ workflowId: 'wf-3' }),
      }) as never
    );

    expect(response.status).toBe(201);
    expect((workflowStore as Map<string, StoreEntry>).get('wf-3')?.state.status).toBe(
      WorkflowStatus.REVIEWING
    );
  });
});

describe('PUT /api/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (workflowStore as Map<string, StoreEntry>).clear();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', name: 'Alice' } });
  });

  it('approves workflow review', async () => {
    seedEntry('wf-4', {
      state: {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'c4', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T02:00:00.000Z'),
      updatedAt: new Date('2026-03-20T02:00:00.000Z'),
      userId: 'user-1',
    });

    const response = await PUT(
      new Request('http://localhost/api/review', {
        method: 'PUT',
        body: JSON.stringify({ workflowId: 'wf-4', decision: 'approve' }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect((workflowStore as Map<string, StoreEntry>).get('wf-4')?.state.status).toBe(
      WorkflowStatus.COMPLETED
    );
    expect((workflowStore as Map<string, StoreEntry>).get('wf-4')?.state.reviewDecision).toBe(
      'approve'
    );
  });

  it('rejects workflow review', async () => {
    seedEntry('wf-5', {
      state: {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'c5', title: 'case', priority: 'P1' }],
        retryCount: 0,
      },
      createdAt: new Date('2026-03-20T03:00:00.000Z'),
      updatedAt: new Date('2026-03-20T03:00:00.000Z'),
      userId: 'user-1',
    });

    const response = await PUT(
      new Request('http://localhost/api/review', {
        method: 'PUT',
        body: JSON.stringify({
          workflowId: 'wf-5',
          decision: 'reject',
          comments: 'Need more boundary cases',
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect((workflowStore as Map<string, StoreEntry>).get('wf-5')?.state.status).toBe(
      WorkflowStatus.ERROR
    );
    expect((workflowStore as Map<string, StoreEntry>).get('wf-5')?.state.error).toContain(
      'Need more boundary cases'
    );
  });
});
