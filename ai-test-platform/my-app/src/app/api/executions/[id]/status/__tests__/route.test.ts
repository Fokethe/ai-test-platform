import { GET, PATCH } from '../route';
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
      findMany: jest.fn(),
      update: jest.fn(),
    },
    executionStatusEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    run: {
      update: jest.fn(),
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

describe('/api/executions/[id]/status route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 404 when execution is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/executions/exe-1/status') as never,
      { params: Promise.resolve({ id: 'exe-1' }) } as never
    );

    expect(response.status).toBe(404);
  });

  it('PATCH returns idempotent result when idempotency key already exists', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exe-1',
      status: 'RUNNING',
      startedAt: new Date('2026-03-19T18:00:00.000Z'),
      completedAt: null,
      run: { id: 'run-1', projectId: 'project-1', startedAt: new Date('2026-03-19T18:00:00.000Z') },
      test: { id: 'test-1', projectId: 'project-1' },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.executionStatusEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'evt-1',
      executionId: 'exe-1',
      idempotencyKey: 'idem-1',
    });

    const response = await PATCH(
      new Request('http://localhost/api/executions/exe-1/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FAILED',
          idempotencyKey: 'idem-1',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'exe-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.idempotent).toBe(true);
  });

  it('PATCH updates execution status and run counters', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.execution.findUnique as jest.Mock).mockResolvedValue({
      id: 'exe-1',
      status: 'RUNNING',
      startedAt: new Date('2026-03-19T18:00:00.000Z'),
      completedAt: null,
      run: { id: 'run-1', projectId: 'project-1', startedAt: new Date('2026-03-19T18:00:00.000Z') },
      test: { id: 'test-1', projectId: 'project-1' },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.executionStatusEvent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        execution: {
          update: jest.fn().mockResolvedValue({ id: 'exe-1', status: 'FAILED' }),
          findMany: jest.fn().mockResolvedValue([{ status: 'FAILED' }]),
        },
        executionStatusEvent: {
          create: jest.fn().mockResolvedValue({ id: 'evt-2', toStatus: 'FAILED' }),
        },
        run: {
          update: jest.fn().mockResolvedValue({
            id: 'run-1',
            status: 'FAILED',
            totalCount: 1,
            passedCount: 0,
            failedCount: 1,
            skippedCount: 0,
            startedAt: new Date('2026-03-19T18:00:00.000Z'),
            completedAt: new Date('2026-03-19T18:01:00.000Z'),
            duration: 60000,
          }),
        },
      })
    );

    const response = await PATCH(
      new Request('http://localhost/api/executions/exe-1/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FAILED',
          note: 'assertion failed',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'exe-1' }) } as never
    );

    expect(response.status).toBe(200);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXECUTION_STATUS_UPDATED',
      })
    );
  });
});
