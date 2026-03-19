import { DELETE, GET, POST, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    page: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    system: {
      findFirst: jest.fn(),
    },
  },
}));

describe('/api/pages route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/pages') as never);
    expect(response.status).toBe(401);
  });

  it('GET returns 403 when querying unauthorized system', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.system.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/pages?systemId=sys-1') as never);
    expect(response.status).toBe(403);
  });

  it('GET scopes list by workspace membership when systemId not provided', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.page.count as jest.Mock).mockResolvedValue(1);
    (prisma.page.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'page-1',
        name: 'Login',
        path: '/login',
        systemId: 'sys-1',
        system: { id: 'sys-1', name: 'System 1' },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/pages?page=1&pageSize=20') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          system: {
            project: {
              workspace: {
                members: {
                  some: { userId: 'user-1' },
                },
              },
            },
          },
        }),
      })
    );
    expect(data.data.list).toHaveLength(1);
  });

  it('POST returns 403 when user cannot manage target system', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.system.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Login',
          path: '/login',
          systemId: 'sys-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(403);
    expect(prisma.page.create).not.toHaveBeenCalled();
  });

  it('PUT returns 403 when batch update includes unauthorized pages', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.page.findMany as jest.Mock).mockResolvedValue([
      { id: 'page-1', systemId: 'sys-1' },
    ]);
    (prisma.system.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await PUT(
      new Request('http://localhost/api/pages', {
        method: 'PUT',
        body: JSON.stringify({
          ids: ['page-1'],
          data: { name: 'Updated' },
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(403);
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('DELETE returns 404 when page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.page.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await DELETE(new Request('http://localhost/api/pages?id=missing') as never);

    expect(response.status).toBe(404);
    expect(prisma.page.delete).not.toHaveBeenCalled();
  });
});
