import { DELETE, GET } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    test: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    execution: {
      groupBy: jest.fn(),
    },
  },
}));

describe('GET /api/tests/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/tests/test-1') as never,
      { params: Promise.resolve({ id: 'test-1' }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 when user has no project access', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.test.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-1',
      projectId: 'project-1',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/tests/test-1') as never,
      { params: Promise.resolve({ id: 'test-1' }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns detail with traceability payload', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'test-1',
        projectId: 'project-1',
      })
      .mockResolvedValueOnce({
        id: 'test-1',
        name: 'Login case',
        description: 'desc',
        type: 'CASE',
        status: 'ACTIVE',
        priority: 'P1',
        source: 'AI',
        content: JSON.stringify([{ action: 'step1' }]),
        tags: JSON.stringify(['smoke']),
        project: { id: 'project-1', name: 'Project 1' },
        requirement: { id: 'req-1', title: 'Login requirement', pageId: 'page-1' },
        parent: null,
        children: [],
        executions: [
          {
            id: 'exec-1',
            runId: 'run-1',
            status: 'PASSED',
            createdAt: new Date(),
            run: { id: 'run-1', name: 'run', status: 'COMPLETED', createdAt: new Date() },
          },
        ],
        issues: [],
      });
    (prisma.execution.groupBy as jest.Mock).mockResolvedValue([
      { status: 'PASSED', _count: { status: 1 } },
    ]);

    const response = await GET(
      new Request('http://localhost/api/tests/test-1') as never,
      { params: Promise.resolve({ id: 'test-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.traceability.requirement.id).toBe('req-1');
    expect(payload.data.executionCount).toBe(1);
  });
});

describe('DELETE /api/tests/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-1',
      projectId: 'project-1',
    });
    (prisma.test.update as jest.Mock).mockResolvedValue({
      id: 'test-1',
      status: 'ARCHIVED',
    });
  });

  it('archives test when authorized', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/tests/test-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'test-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(prisma.test.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-1' },
        data: { status: 'ARCHIVED' },
      })
    );
  });
});
