import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    integration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('POST /api/integrations/[id]/toggle', () => {
  const params = { params: Promise.resolve({ id: 'int-1' }) } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/integrations/int-1/toggle', { method: 'POST' }) as never,
      params
    );

    expect(response.status).toBe(401);
  });

  it('toggles integration isActive', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.integration.findUnique as jest.Mock).mockResolvedValue({ id: 'int-1', isActive: true });
    (prisma.integration.update as jest.Mock).mockResolvedValue({
      id: 'int-1',
      isActive: false,
      _count: { deliveries: 0 },
    });

    const response = await POST(
      new Request('http://localhost/api/integrations/int-1/toggle', { method: 'POST' }) as never,
      params
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int-1' },
        data: { isActive: false },
      })
    );
    expect(payload.data.isActive).toBe(false);
  });
});

