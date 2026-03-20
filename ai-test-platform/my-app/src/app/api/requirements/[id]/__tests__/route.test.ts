import { GET } from '../route';
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
    aiRequirement: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/requirements/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.test.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'project-1',
      name: 'Project 1',
    });
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('returns 500 when database query throws', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (prisma.aiRequirement.findUnique as jest.Mock).mockRejectedValue(
      new Error('db connection lost')
    );

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(500);
  });

  it('returns 404 when requirement does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(404);
  });

  it('returns 403 when user cannot access requirement project', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      features: '[]',
      businessRules: '[]',
      testPoints: [],
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('returns grouped test points and traceability for authorized user', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      title: 'Login Requirement',
      projectId: 'project-1',
      filename: 'req.txt',
      type: 'txt',
      content: 'content',
      rawText: 'content',
      size: 10,
      version: 2,
      confirmedAt: new Date('2026-03-19T10:00:00.000Z'),
      confirmedBy: 'user-1',
      createdAt: new Date('2026-03-18T10:00:00.000Z'),
      updatedAt: new Date('2026-03-19T10:00:00.000Z'),
      features: JSON.stringify(['Login']),
      businessRules: JSON.stringify([{ type: 'time', value: '5 minutes' }]),
      testPoints: [
        {
          id: 'tp-1',
          name: 'Login success',
          description: 'Happy path',
          priority: 'P0',
          relatedFeature: 'Login',
          order: 0,
        },
        {
          id: 'tp-2',
          name: 'Login failure',
          description: 'Negative path',
          priority: 'P1',
          relatedFeature: 'Login',
          order: 1,
        },
      ],
    });
    (prisma.test.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'test-1',
        name: 'Login case',
        type: 'CASE',
        status: 'ACTIVE',
        source: 'AI',
        createdAt: new Date('2026-03-19T10:00:00.000Z'),
        updatedAt: new Date('2026-03-19T10:00:00.000Z'),
        _count: {
          executions: 3,
          issues: 1,
        },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.features).toEqual(['Login']);
    expect(payload.data.testPointGroups).toHaveLength(1);
    expect(payload.data.testPointGroups[0].feature).toBe('Login');
    expect(payload.data.isConfirmed).toBe(true);
    expect(payload.data.traceability.summary.linkedTestCount).toBe(1);
    expect(payload.data.traceability.summary.totalExecutionCount).toBe(3);
    expect(hasProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });
});
