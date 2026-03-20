import { GET } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    integration: {
      findUnique: jest.fn(),
    },
    delivery: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/integrations/[id]/deliveries', () => {
  const params = { params: Promise.resolve({ id: 'int-1' }) } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/integrations/int-1/deliveries') as never,
      params
    );

    expect(response.status).toBe(401);
  });

  it('returns paginated deliveries', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.integration.findUnique as jest.Mock).mockResolvedValue({ id: 'int-1' });
    (prisma.delivery.count as jest.Mock)
      .mockResolvedValueOnce(1) // list total
      .mockResolvedValueOnce(2) // summary total
      .mockResolvedValueOnce(1) // delivered
      .mockResolvedValueOnce(1) // failed
      .mockResolvedValueOnce(0); // retrying
    (prisma.delivery.findMany as jest.Mock)
      .mockResolvedValueOnce([
      {
        id: 'del-1',
        integrationId: 'int-1',
        event: 'run.completed',
        status: 'DELIVERED',
        payload: '{}',
        attempts: 1,
        createdAt: new Date('2026-03-20T00:00:00.000Z'),
      },
    ])
      .mockResolvedValueOnce([
        {
          id: 'del-failed-1',
          event: 'issue.created',
          attempts: 3,
          error: 'HTTP_500',
          responseStatus: 500,
          createdAt: new Date('2026-03-20T00:01:00.000Z'),
        },
      ]);

    const response = await GET(
      new Request('http://localhost/api/integrations/int-1/deliveries?page=1&pageSize=20') as never,
      params
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.list).toHaveLength(1);
    expect(payload.data.pagination.total).toBe(1);
    expect(payload.data.summary.successRate).toBe(50);
    expect(payload.data.failedSamples).toHaveLength(1);
  });

  it('returns 400 when status filter is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.integration.findUnique as jest.Mock).mockResolvedValue({ id: 'int-1' });

    const response = await GET(
      new Request('http://localhost/api/integrations/int-1/deliveries?status=INVALID') as never,
      params
    );

    expect(response.status).toBe(400);
  });
});
