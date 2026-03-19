import { GET } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
    aiRequirement: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/requirements?page=1&pageSize=20') as never
    );

    expect(response.status).toBe(401);
  });

  it('returns requirement list scoped by user access', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
    });
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: 'project-1', name: 'Project 1' },
    ]);
    (prisma.aiRequirement.count as jest.Mock).mockResolvedValue(1);
    (prisma.aiRequirement.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'req-1',
        title: 'Login Requirement',
        filename: 'req.txt',
        type: 'txt',
        content: 'content',
        rawText: 'content',
        size: 10,
        features: JSON.stringify(['Login']),
        businessRules: '[]',
        projectId: 'project-1',
        version: 1,
        confirmedAt: null,
        confirmedBy: null,
        createdBy: 'user-1',
        createdAt: new Date('2026-03-19T10:00:00.000Z'),
        updatedAt: new Date('2026-03-19T10:00:00.000Z'),
        testPoints: [
          {
            id: 'tp-1',
            name: 'Login success',
            description: 'desc',
            priority: 'P0',
            relatedFeature: 'Login',
            order: 0,
          },
        ],
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/requirements?page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list).toHaveLength(1);
    expect(payload.data.list[0].testPointCount).toBe(1);
    expect(payload.data.list[0].testPointGroups[0].feature).toBe('Login');
    expect(prisma.aiRequirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: expect.anything(),
        }),
      })
    );
  });
});
