import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    roleMenuPermission: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Admin Menu Permissions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (writeAuditLog as jest.Mock).mockResolvedValue(undefined);
    (prisma.roleMenuPermission.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
  });

  it('GET returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/admin/menu-permissions') as never);
    expect(response.status).toBe(401);
  });

  it('GET returns 403 when non-admin', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const response = await GET(new Request('http://localhost/api/admin/menu-permissions') as never);
    expect(response.status).toBe(403);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FORBIDDEN_MENU_PERMISSION_WRITE',
      })
    );
  });

  it('GET returns matrix for admin', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    (prisma.roleMenuPermission.findMany as jest.Mock).mockResolvedValue([
      { role: 'USER', menuKey: 'settings', enabled: false },
      { role: 'USER', menuKey: 'dashboard', enabled: true },
    ]);

    const response = await GET(new Request('http://localhost/api/admin/menu-permissions') as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.roles).toEqual(['ADMIN', 'USER', 'GUEST']);
    expect(payload.data.menus.length).toBeGreaterThan(0);
    expect(payload.data.matrix.USER).toContain('dashboard');
    expect(payload.data.matrix.USER).not.toContain('settings');
  });

  it('PUT returns 400 for invalid role', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });

    const response = await PUT(
      new Request('http://localhost/api/admin/menu-permissions', {
        method: 'PUT',
        body: JSON.stringify({
          role: 'MEMBER',
          menuKeys: ['dashboard'],
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT updates role menu permissions for admin', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    (prisma.roleMenuPermission.findMany as jest.Mock).mockResolvedValue([
      { role: 'USER', menuKey: 'dashboard', enabled: true },
      { role: 'USER', menuKey: 'projects', enabled: true },
    ]);

    const response = await PUT(
      new Request('http://localhost/api/admin/menu-permissions', {
        method: 'PUT',
        body: JSON.stringify({
          role: 'USER',
          menuKeys: ['dashboard', 'projects'],
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ROLE_MENU_PERMISSION_UPDATED',
        targetId: 'USER',
      })
    );
  });
});
