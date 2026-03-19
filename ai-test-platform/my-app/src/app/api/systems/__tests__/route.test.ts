import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
  PROJECT_MANAGE_ROLES: ['OWNER', 'ADMIN'],
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    system: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('/api/systems route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 without session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/systems') as never);
    expect(response.status).toBe(401);
  });

  it('GET returns 403 for unauthorized projectId filter', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(new Request('http://localhost/api/systems?projectId=proj-1') as never);
    expect(response.status).toBe(403);
  });

  it('GET scopes list by project membership when projectId is not provided', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.system.count as jest.Mock).mockResolvedValue(1);
    (prisma.system.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sys-1',
        name: 'System 1',
        baseUrl: 'https://example.com',
        projectId: 'proj-1',
        project: { id: 'proj-1', name: 'Project 1' },
        _count: { pages: 2 },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/systems') as never);
    expect(response.status).toBe(200);
    expect(prisma.system.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: {
            OR: expect.arrayContaining([
              {
                members: {
                  some: {
                    userId: 'user-1',
                  },
                },
              },
            ]),
          },
        },
      })
    );
  });

  it('POST creates system for authorized project manager', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.system.create as jest.Mock).mockResolvedValue({
      id: 'sys-1',
      name: 'System 1',
      projectId: 'proj-1',
    });

    const response = await POST(
      new Request('http://localhost/api/systems', {
        method: 'POST',
        body: JSON.stringify({
          name: 'System 1',
          baseUrl: 'https://example.com',
          projectId: 'proj-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(201);
    expect(hasProjectAccess).toHaveBeenCalledWith('owner-1', 'proj-1', ['OWNER', 'ADMIN']);
    expect(prisma.system.create).toHaveBeenCalled();
  });
});
