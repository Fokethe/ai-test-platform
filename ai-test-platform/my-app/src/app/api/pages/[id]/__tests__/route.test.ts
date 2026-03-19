import { DELETE, GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasSystemAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasSystemAccess: jest.fn(),
  PROJECT_MANAGE_ROLES: ['OWNER', 'ADMIN'],
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    page: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const params = { params: Promise.resolve({ id: 'page-1' }) } as const;

describe('/api/pages/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 404 when page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.page.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/pages/page-1') as never, params);
    expect(response.status).toBe(404);
  });

  it('PUT returns 403 when user is not allowed to manage page', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.page.findUnique as jest.Mock).mockResolvedValue({
      id: 'page-1',
      systemId: 'sys-1',
    });
    (hasSystemAccess as jest.Mock).mockResolvedValue(false);

    const response = await PUT(
      new Request('http://localhost/api/pages/page-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Page' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );

    expect(response.status).toBe(403);
    expect(prisma.page.update).not.toHaveBeenCalled();
  });

  it('DELETE removes page when user is manager', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (prisma.page.findUnique as jest.Mock).mockResolvedValue({
      id: 'page-1',
      systemId: 'sys-1',
    });
    (hasSystemAccess as jest.Mock).mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/pages/page-1', { method: 'DELETE' }) as never,
      params
    );

    expect(response.status).toBe(200);
    expect(prisma.page.delete).toHaveBeenCalledWith({ where: { id: 'page-1' } });
  });
});
