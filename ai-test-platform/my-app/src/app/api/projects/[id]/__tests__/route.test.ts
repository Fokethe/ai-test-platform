import { DELETE, GET, PUT } from '../route';
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
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const params = { params: Promise.resolve({ id: 'proj-1' }) } as const;

describe('/api/projects/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    expect(response.status).toBe(401);
  });

  it('GET returns 404 when project does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    expect(response.status).toBe(404);
    expect(hasProjectAccess).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user cannot access project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'proj-1', workspaceId: 'ws-1' });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    expect(response.status).toBe(403);
  });

  it('GET returns project details for authorized member', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'proj-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Project 1',
        workspace: { id: 'ws-1', name: 'Workspace 1' },
        tests: [],
        runs: [],
        issues: [],
        _count: { tests: 0, runs: 0, issues: 0, systems: 2, members: 3 },
      });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.systemCount).toBe(2);
    expect(data.data.memberCount).toBe(3);
  });

  it('PUT returns 403 when user cannot manage project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await PUT(
      new Request('http://localhost/api/projects/proj-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );

    expect(response.status).toBe(403);
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('DELETE removes project for authorized manager', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    (prisma.project.delete as jest.Mock).mockResolvedValue({ id: 'proj-1' });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/projects/proj-1', { method: 'DELETE' }) as never,
      params
    );

    expect(response.status).toBe(200);
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
  });
});
