import { DELETE, GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    run: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    execution: {
      updateMany: jest.fn(),
    },
    executionStatusEvent: {
      createMany: jest.fn(),
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

describe('/api/runs/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 404 when run does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/runs/run-1') as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(404);
  });

  it('GET returns run detail with stats', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      projectId: 'project-1',
      executions: [{ status: 'PASSED' }, { status: 'FAILED' }],
      issues: [],
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);

    const response = await GET(
      new Request('http://localhost/api/runs/run-1') as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.stats.failed).toBe(1);
  });

  it('PUT cancels run and records audit log', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      projectId: 'project-1',
      startedAt: new Date('2026-03-19T18:00:00.000Z'),
      completedAt: null,
      executions: [
        { id: 'exe-1', status: 'RUNNING', startedAt: new Date('2026-03-19T18:01:00.000Z') },
      ],
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        execution: {
          updateMany: prisma.execution.updateMany,
        },
        executionStatusEvent: {
          createMany: prisma.executionStatusEvent.createMany,
        },
        run: {
          update: jest.fn().mockResolvedValue({
            id: 'run-1',
            projectId: 'project-1',
            name: 'run',
            status: 'CANCELLED',
            startedAt: new Date('2026-03-19T18:00:00.000Z'),
            completedAt: new Date('2026-03-19T18:03:00.000Z'),
          }),
        },
      })
    );
    (prisma.run.update as jest.Mock).mockResolvedValue({});

    const response = await PUT(
      new Request('http://localhost/api/runs/run-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(200);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RUN_UPDATED',
      })
    );
  });

  it('DELETE removes run', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      projectId: 'project-1',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.run.delete as jest.Mock).mockResolvedValue({ id: 'run-1' });

    const response = await DELETE(
      new Request('http://localhost/api/runs/run-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(200);
    expect(prisma.run.delete).toHaveBeenCalledWith({ where: { id: 'run-1' } });
  });
});
