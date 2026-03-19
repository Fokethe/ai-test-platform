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
    project: {
      findMany: jest.fn(),
    },
    run: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
    execution: {
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

describe('/api/runs route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/runs') as never);
    expect(response.status).toBe(401);
  });

  it('GET returns run list for accessible projects', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findMany as jest.Mock).mockResolvedValue([{ id: 'project-1' }]);
    (prisma.run.count as jest.Mock).mockResolvedValue(1);
    (prisma.run.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'run-1',
        name: 'regression run',
        status: 'RUNNING',
        type: 'MANUAL',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/runs?page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list).toHaveLength(1);
  });

  it('POST creates and starts run', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findMany as jest.Mock).mockResolvedValue([{ id: 'test-1' }]);

    const tx = {
      run: {
        create: jest.fn().mockResolvedValue({
          id: 'run-1',
          name: 'nightly',
          status: 'RUNNING',
          type: 'MANUAL',
          projectId: 'project-1',
          totalCount: 1,
          startedAt: new Date('2026-03-19T18:00:00.000Z'),
          createdAt: new Date('2026-03-19T18:00:00.000Z'),
        }),
      },
      execution: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(tx));

    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'nightly',
          projectId: 'project-1',
          testIds: ['test-1'],
          startNow: true,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.code).toBe(0);
    expect(payload.data.status).toBe('RUNNING');
    expect(tx.execution.createMany).toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RUN_CREATED',
      })
    );
  });
});
