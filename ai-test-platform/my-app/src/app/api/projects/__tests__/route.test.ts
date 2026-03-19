import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/projects') as never);
    expect(response.status).toBe(401);
  });

  it('returns 403 when workspaceId is not accessible', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/projects?workspaceId=ws-1&page=1&pageSize=20') as never
    );

    expect(response.status).toBe(403);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('filters projects by workspace membership', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Project 1',
        description: null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workspaceId: 'ws-1',
        workspace: {
          id: 'ws-1',
          name: 'Workspace 1',
          _count: { members: 3 },
        },
        _count: { systems: 2, tests: 4, runs: 1, issues: 0 },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/projects') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspace: {
            members: {
              some: {
                userId: 'user-1',
              },
            },
          },
        }),
      })
    );
    expect(data.data.list[0]).toEqual(
      expect.objectContaining({
        id: 'proj-1',
        systemCount: 2,
        testCount: 4,
        memberCount: 3,
      })
    );
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when user cannot manage workspace', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Project',
          workspaceId: 'ws-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(403);
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it('creates project when workspace manager is authorized', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
    (prisma.project.create as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      name: 'New Project',
      workspaceId: 'ws-1',
      status: 'ACTIVE',
    });

    const response = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Project',
          workspaceId: 'ws-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(prisma.project.create).toHaveBeenCalled();
    expect(data.data.id).toBe('proj-1');
  });
});
