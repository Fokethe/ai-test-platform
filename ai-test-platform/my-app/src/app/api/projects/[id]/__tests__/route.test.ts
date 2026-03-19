import { DELETE, GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
    },
  },
}));

const params = { params: Promise.resolve({ id: 'proj-1' }) } as const;

describe('/api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 403 for non-member user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'proj-1', workspaceId: 'ws-1' });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    expect(response.status).toBe(403);
  });

  it('GET returns project details for workspace member', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'proj-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Project 1',
        workspace: {
          id: 'ws-1',
          name: 'Workspace 1',
          _count: { members: 3 },
        },
        tests: [],
        runs: [],
        issues: [],
        _count: { tests: 0, runs: 0, issues: 0, systems: 2 },
      });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

    const response = await GET(new Request('http://localhost/api/projects/proj-1') as never, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.systemCount).toBe(2);
    expect(data.data.memberCount).toBe(3);
  });

  it('PUT returns 403 when user is not workspace manager', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    (prisma.workspaceMember.findFirst as jest.Mock).mockResolvedValue(null);

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

  it('DELETE returns 404 when project does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await DELETE(
      new Request('http://localhost/api/projects/proj-1', { method: 'DELETE' }) as never,
      params
    );

    expect(response.status).toBe(404);
    expect(prisma.project.delete).not.toHaveBeenCalled();
  });
});
