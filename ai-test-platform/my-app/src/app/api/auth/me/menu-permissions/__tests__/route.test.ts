import { GET } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    roleMenuPermission: {
      findMany: jest.fn(),
    },
  },
}));

describe('/api/auth/me/menu-permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns default role menus when no role-specific rows exist', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (prisma.roleMenuPermission.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.role).toBe('USER');
    expect(payload.data.menuKeys).toContain('dashboard');
  });

  it('returns stored menu rows when role is customized', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'GUEST' },
    });
    (prisma.roleMenuPermission.findMany as jest.Mock).mockResolvedValue([
      { menuKey: 'dashboard', enabled: true },
      { menuKey: 'reports', enabled: true },
      { menuKey: 'settings', enabled: false },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.menuKeys).toEqual(expect.arrayContaining(['dashboard', 'reports']));
    expect(payload.data.menuKeys).not.toContain('settings');
  });
});
