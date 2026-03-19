import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    issue: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    issueLifecycleEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    execution: {
      findUnique: jest.fn(),
    },
    run: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

describe('/api/issues/[id]/lifecycle route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 404 when issue is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/issues/issue-1/lifecycle') as never,
      { params: Promise.resolve({ id: 'issue-1' }) } as never
    );

    expect(response.status).toBe(404);
  });

  it('GET returns issue lifecycle history', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.issue.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'issue-1',
        projectId: 'project-1',
        status: 'OPEN',
        runId: 'run-1',
        testId: 'test-1',
        executionId: 'exe-1',
        resolvedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'issue-1',
        status: 'OPEN',
        reporter: { id: 'user-1', name: 'u', email: 'a@b.com' },
        assignee: null,
      });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.issueLifecycleEvent.findMany as jest.Mock).mockResolvedValue([
      { id: 'life-1', fromStatus: null, toStatus: 'OPEN' },
    ]);

    const response = await GET(
      new Request('http://localhost/api/issues/issue-1/lifecycle') as never,
      { params: Promise.resolve({ id: 'issue-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.lifecycle).toHaveLength(1);
  });

  it('POST updates issue lifecycle with regression link', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      projectId: 'project-1',
      status: 'IN_PROGRESS',
      runId: 'run-1',
      testId: 'test-1',
      executionId: 'exe-1',
      resolvedAt: null,
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({ id: 'exe-2', runId: 'run-2' });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue({ id: 'run-2' });
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        issue: {
          update: jest.fn().mockResolvedValue({
            id: 'issue-1',
            status: 'CLOSED',
          }),
        },
        issueLifecycleEvent: {
          create: jest.fn().mockResolvedValue({
            id: 'life-2',
            fromStatus: 'IN_PROGRESS',
            toStatus: 'CLOSED',
          }),
        },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/issues/issue-1/lifecycle', {
        method: 'POST',
        body: JSON.stringify({
          status: 'CLOSED',
          note: 'verified by regression',
          regressionRunId: 'run-2',
          regressionExecutionId: 'exe-2',
          regressionResult: 'PASSED',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'issue-1' }) } as never
    );

    expect(response.status).toBe(200);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ISSUE_LIFECYCLE_UPDATED',
      })
    );
  });
});
