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
    system: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const params = { params: Promise.resolve({ id: 'sys-1' }) } as const;

describe('/api/systems/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 404 when system is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.system.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/systems/sys-1') as never, params);
    expect(response.status).toBe(404);
  });

  it('PUT returns 403 when user cannot manage project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.system.findUnique as jest.Mock).mockResolvedValue({ id: 'sys-1', projectId: 'proj-1' });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await PUT(
      new Request('http://localhost/api/systems/sys-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated System' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params
    );

    expect(response.status).toBe(403);
    expect(prisma.system.update).not.toHaveBeenCalled();
  });

  it('DELETE removes system when manager is authorized', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'owner-1' } });
    (prisma.system.findUnique as jest.Mock).mockResolvedValue({ id: 'sys-1', projectId: 'proj-1' });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.system.delete as jest.Mock).mockResolvedValue({ id: 'sys-1' });

    const response = await DELETE(
      new Request('http://localhost/api/systems/sys-1', { method: 'DELETE' }) as never,
      params
    );

    expect(response.status).toBe(200);
    expect(prisma.system.delete).toHaveBeenCalledWith({ where: { id: 'sys-1' } });
  });
});
