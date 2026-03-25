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
    run: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/runs') as never);
    expect(response.status).toBe(401);
  });

  it('returns 403 when project is not accessible', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/runs?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('returns paginated run list for accessible project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.run.count as jest.Mock).mockResolvedValue(1);
    (prisma.run.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'run-1',
        name: 'Run 1',
        status: 'RUNNING',
        type: 'MANUAL',
        project: { id: 'project-1', name: 'Project 1' },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/runs?projectId=project-1&page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list[0].id).toBe('run-1');
    expect(prisma.run.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      })
    );
  });
});

describe('POST /api/runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns 400 when projectId is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({ testIds: ['test-1'] }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when testIds is empty', async () => {
    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-1', testIds: [] }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 when project is not accessible', async () => {
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-1', testIds: ['test-1'] }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('returns 400 when nextRunAt is invalid', async () => {
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findMany as jest.Mock).mockResolvedValue([{ id: 'test-1' }]);

    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          testIds: ['test-1'],
          nextRunAt: 'invalid-date',
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('creates run with executions for valid payload', async () => {
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findMany as jest.Mock).mockResolvedValue([{ id: 'test-1' }, { id: 'test-2' }]);
    (prisma.run.create as jest.Mock).mockResolvedValue({
      id: 'run-1',
      executions: [
        { id: 'exec-1', testId: 'test-1', status: 'PENDING' },
        { id: 'exec-2', testId: 'test-2', status: 'PENDING' },
      ],
    });

    const response = await POST(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Nightly run',
          projectId: 'project-1',
          testIds: ['test-1', 'test-2'],
          autoStart: true,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe('run-1');
    expect(prisma.run.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          project: { connect: { id: 'project-1' } },
          createdBy: 'user-1',
          status: 'RUNNING',
          totalCount: 2,
          executions: {
            create: [
              { testId: 'test-1', status: 'PENDING' },
              { testId: 'test-2', status: 'PENDING' },
            ],
          },
        }),
      })
    );
  });
});
