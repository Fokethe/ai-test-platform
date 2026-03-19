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

describe('/api/runs/[id]/rerun route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when source run not found', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/runs/run-1/rerun', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(404);
  });

  it('creates rerun successfully', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.run.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      name: 'origin run',
      description: 'desc',
      type: 'MANUAL',
      cron: null,
      scheduleId: null,
      projectId: 'project-1',
      executions: [{ testId: 'test-1' }, { testId: 'test-2' }],
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        run: {
          create: jest.fn().mockResolvedValue({
            id: 'run-2',
            projectId: 'project-1',
            totalCount: 2,
          }),
        },
        execution: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/runs/run-1/rerun', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.code).toBe(0);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RUN_RERUN_TRIGGERED',
      })
    );
  });
});
