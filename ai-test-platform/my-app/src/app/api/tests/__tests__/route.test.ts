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
    test: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    requirement: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/tests') as never);
    expect(response.status).toBe(401);
  });

  it('returns paginated tests for accessible projects', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.test.count as jest.Mock).mockResolvedValue(1);
    (prisma.test.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'test-1',
        name: 'Login case',
        description: 'desc',
        type: 'CASE',
        status: 'ACTIVE',
        priority: 'P1',
        source: 'AI',
        tags: '["smoke"]',
        createdAt: new Date(),
        updatedAt: new Date(),
        customFieldValues: [],
        _count: { executions: 2 },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/tests?type=CASE&status=ACTIVE&page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list[0].id).toBe('test-1');
    expect(prisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      })
    );
  });
});

describe('POST /api/tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.requirement.findFirst as jest.Mock).mockResolvedValue({ id: 'req-1' });
    (prisma.test.create as jest.Mock).mockResolvedValue({
      id: 'test-1',
      name: 'Login case',
      projectId: 'project-1',
      requirementId: 'req-1',
    });
  });

  it('returns 400 when requirementId is missing and no fallback exists', async () => {
    (prisma.requirement.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await POST(
      new Request('http://localhost/api/tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Login case',
          projectId: 'project-1',
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 when user cannot access project', async () => {
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Login case',
          projectId: 'project-1',
          requirementId: 'req-1',
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('creates test asset with requirement link', async () => {
    const response = await POST(
      new Request('http://localhost/api/tests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Login case',
          projectId: 'project-1',
          requirementId: 'req-1',
          type: 'CASE',
          source: 'AI',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe('test-1');
    expect(prisma.test.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          requirementId: 'req-1',
        }),
      })
    );
  });
});
