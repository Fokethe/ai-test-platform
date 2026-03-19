import { DELETE, GET, POST, PUT } from '../route';
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
    },
    projectMember: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const params = { params: Promise.resolve({ id: 'proj-1' }) } as const;

describe('/api/projects/[id]/members route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
  });

  it('GET returns 403 when user cannot access project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(new Request('http://localhost/api/projects/proj-1/members') as never, params);

    expect(response.status).toBe(403);
    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
  });

  it('POST creates project member with explicit LOANED access type', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' });
    (prisma.projectMember.upsert as jest.Mock).mockResolvedValue({
      id: 'pm-2',
      projectId: 'proj-1',
      userId: 'user-2',
      role: 'MEMBER',
      accessType: 'LOANED',
    });

    const response = await POST(
      new Request('http://localhost/api/projects/proj-1/members', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-2',
          role: 'MEMBER',
          accessType: 'LOANED',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );

    expect(response.status).toBe(201);
    expect(prisma.projectMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          projectId: 'proj-1',
          userId: 'user-2',
          role: 'MEMBER',
          accessType: 'LOANED',
        }),
      })
    );
  });

  it('PUT supports ownership handover', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({ id: 'pm-2' });
    (prisma.projectMember.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.projectMember.update as jest.Mock).mockResolvedValue({ id: 'pm-2' });
    (prisma.$transaction as jest.Mock).mockResolvedValue([{ count: 1 }, { id: 'pm-2' }]);

    const response = await PUT(
      new Request('http://localhost/api/projects/proj-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-2',
          transferOwnership: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(data.data.transferred).toBe(true);
  });

  it('DELETE blocks removing the last project owner', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
      id: 'pm-owner',
      role: 'OWNER',
    });
    (prisma.projectMember.count as jest.Mock).mockResolvedValue(1);

    const response = await DELETE(
      new Request('http://localhost/api/projects/proj-1/members', {
        method: 'DELETE',
        body: JSON.stringify({ userId: 'owner-1' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );

    expect(response.status).toBe(400);
    expect(prisma.projectMember.delete).not.toHaveBeenCalled();
  });
});
