import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    integration: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('/api/integrations route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns paginated integrations list', async () => {
    (prisma.integration.count as jest.Mock).mockResolvedValue(1);
    (prisma.integration.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'int-1',
        name: 'Webhook A',
        events: '["run.completed"]',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/integrations?page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.list).toHaveLength(1);
    expect(payload.data.pagination.total).toBe(1);
  });

  it('POST returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/integrations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Webhook A',
          type: 'CUSTOM',
          url: 'https://example.com/hook',
          projectId: 'project-1',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('POST defaults events when events is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.integration.create as jest.Mock).mockResolvedValue({
      id: 'int-1',
      name: 'Webhook A',
    });

    const response = await POST(
      new Request('http://localhost/api/integrations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Webhook A',
          type: 'CUSTOM',
          url: 'https://example.com/hook',
          projectId: 'project-1',
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    expect(prisma.integration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          events: JSON.stringify(['run.completed', 'issue.created']),
          createdBy: 'user-1',
        }),
      })
    );
  });
});
