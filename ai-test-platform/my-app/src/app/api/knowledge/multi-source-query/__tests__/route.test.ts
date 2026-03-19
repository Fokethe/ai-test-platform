import { POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { executeMultiSourceQuery } from '@/lib/ai/rag/multi-source-query';
import { writeAuditLog } from '@/lib/audit';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/rag/multi-source-query', () => ({
  executeMultiSourceQuery: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

describe('POST /api/knowledge/multi-source-query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/multi-source-query', {
        method: 'POST',
        body: JSON.stringify({ query: 'login' }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await POST(
      new Request('http://localhost/api/knowledge/multi-source-query', {
        method: 'POST',
        body: JSON.stringify({ query: '' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 when explicit project is forbidden', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/knowledge/multi-source-query', {
        method: 'POST',
        body: JSON.stringify({ query: 'login', projectId: 'project-1' }),
      }) as never
    );

    expect(response.status).toBe(403);
    expect(hasProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('runs multi-source execution with explicit project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (executeMultiSourceQuery as jest.Mock).mockResolvedValue({
      plans: [
        {
          source: 'relational',
          statement: 'SQL',
          params: { query: 'login', projectIds: ['project-1'] },
        },
      ],
      sourceResults: [
        {
          source: 'relational',
          success: true,
          plan: { source: 'relational', statement: 'SQL', params: {} },
          items: [
            {
              id: 'test:1',
              title: 'Login',
              snippet: 'snippet',
              score: 0.9,
              source: 'relational',
            },
          ],
          latencyMs: 12,
        },
        {
          source: 'graph',
          success: false,
          plan: { source: 'graph', statement: 'Cypher', params: {} },
          items: [],
          error: 'GRAPH_BACKEND_DOWN',
          latencyMs: 5,
        },
      ],
      mergedCandidates: [
        {
          id: 'test:1',
          title: 'Login',
          snippet: 'snippet',
          score: 0.9,
          source: 'relational',
        },
      ],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/multi-source-query', {
        method: 'POST',
        body: JSON.stringify({ query: 'login', projectId: 'project-1', topK: 5 }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.meta.totalCandidates).toBe(1);
    expect(payload.data.meta.failedSources).toEqual([
      { source: 'graph', error: 'GRAPH_BACKEND_DOWN' },
    ]);
    expect(executeMultiSourceQuery).toHaveBeenCalledWith({
      query: 'login',
      projectIds: ['project-1'],
      topK: 5,
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        action: 'MULTI_SOURCE_QUERY_PARTIAL_FAILURE',
      })
    );
  });

  it('returns empty results when user has no accessible projects', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

    const response = await POST(
      new Request('http://localhost/api/knowledge/multi-source-query', {
        method: 'POST',
        body: JSON.stringify({ query: 'login' }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.meta.projectScopeCount).toBe(0);
    expect(payload.data.mergedCandidates).toEqual([]);
    expect(executeMultiSourceQuery).not.toHaveBeenCalled();
  });
});
