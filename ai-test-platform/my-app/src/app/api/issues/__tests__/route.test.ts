import { GET, POST } from '../route';
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
    issue: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    execution: {
      findUnique: jest.fn(),
    },
    run: {
      findFirst: jest.fn(),
    },
    test: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/issues') as never);
    expect(response.status).toBe(401);
  });

  it('returns 403 when project is not accessible', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/issues?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('returns paginated issues for accessible scope', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.issue.count as jest.Mock).mockResolvedValue(1);
    (prisma.issue.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'issue-1',
        title: 'Issue title',
        status: 'OPEN',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/issues?projectId=project-1&page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list[0].id).toBe('issue-1');
    expect(prisma.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      })
    );
  });
});

describe('POST /api/issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.run.findFirst as jest.Mock).mockResolvedValue({ id: 'run-1' });
    (prisma.test.findFirst as jest.Mock).mockResolvedValue({ id: 'test-1' });
  });

  it('returns 400 when title and projectId are missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when executionId does not exist', async () => {
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        body: JSON.stringify({ executionId: 'exec-1' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when execution is not failed', async () => {
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exec-1',
      status: 'PASSED',
      test: { id: 'test-1', name: 'Login test' },
      run: { id: 'run-1', name: 'Run 1', projectId: 'project-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        body: JSON.stringify({ executionId: 'exec-1' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when execution project mismatches provided projectId', async () => {
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exec-1',
      status: 'FAILED',
      test: { id: 'test-1', name: 'Login test' },
      run: { id: 'run-1', name: 'Run 1', projectId: 'project-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        body: JSON.stringify({ executionId: 'exec-1', projectId: 'project-2' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('creates issue from failed executionId quick-create flow', async () => {
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exec-1',
      status: 'FAILED',
      errorMessage: 'Assertion failed',
      completedAt: new Date('2026-03-20T10:00:00.000Z'),
      test: { id: 'test-1', name: 'Login test' },
      run: { id: 'run-1', name: 'Run 1', projectId: 'project-1' },
    });
    (prisma.issue.create as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      title: 'Failed execution: Login test',
      projectId: 'project-1',
      runId: 'run-1',
      testId: 'test-1',
    });

    const response = await POST(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        body: JSON.stringify({
          executionId: 'exec-1',
          projectId: 'project-1',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe('issue-1');
    expect(prisma.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Failed execution: Login test',
          projectId: 'project-1',
          runId: 'run-1',
          testId: 'test-1',
          reporterId: 'user-1',
          status: 'OPEN',
          description: expect.stringContaining('Execution: exec-1'),
        }),
      })
    );
  });
});
