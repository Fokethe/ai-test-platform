import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    execution: {
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

describe('/api/executions/[id]/issue route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when execution is not failed', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exe-1',
      status: 'PASSED',
      run: { id: 'run-1', name: 'run', projectId: 'project-1' },
      test: { id: 'test-1', name: 'test', projectId: 'project-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/executions/exe-1/issue', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'exe-1' }) } as never
    );

    expect(response.status).toBe(400);
  });

  it('creates issue from failed execution', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exe-1',
      status: 'FAILED',
      errorMessage: 'assert failed',
      stderr: 'stderr',
      stdout: 'stdout',
      run: { id: 'run-1', name: 'run', projectId: 'project-1' },
      test: { id: 'test-1', name: 'test', projectId: 'project-1' },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        issue: {
          create: jest.fn().mockResolvedValue({
            id: 'issue-1',
            executionId: 'exe-1',
            status: 'OPEN',
          }),
        },
        issueLifecycleEvent: {
          create: jest.fn().mockResolvedValue({ id: 'life-1' }),
        },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/executions/exe-1/issue', {
        method: 'POST',
        body: JSON.stringify({
          severity: 'HIGH',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'exe-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.code).toBe(0);
    expect(payload.data.executionId).toBe('exe-1');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ISSUE_CREATED_FROM_EXECUTION',
      })
    );
  });
});
