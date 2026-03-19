import { DELETE, POST, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    test: {
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('/api/tests/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns 401 for unauthenticated request', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await DELETE(
      new Request('http://localhost/api/tests/batch', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['test-1'] }),
      }) as never
    );
    expect(response.status).toBe(401);
  });

  it('returns per-item results for batch delete', async () => {
    (prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 'test-1', projectId: 'project-1' },
    ]);
    (prisma.test.update as jest.Mock).mockResolvedValue({ id: 'test-1' });

    const response = await DELETE(
      new Request('http://localhost/api/tests/batch', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['test-1', 'test-2'] }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.summary.requested).toBe(2);
    expect(payload.data.summary.succeeded).toBe(1);
    expect(payload.data.summary.failed).toBe(1);
    expect(payload.data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'test-1', success: true, action: 'delete' }),
        expect.objectContaining({
          id: 'test-2',
          success: false,
          action: 'delete',
          reason: 'FORBIDDEN',
        }),
      ])
    );
  });

  it('updates status in batch with source metadata', async () => {
    (prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 'test-1', projectId: 'project-1' },
      { id: 'test-2', projectId: 'project-1' },
    ]);
    (prisma.test.update as jest.Mock).mockResolvedValue({ id: 'test-1' });

    const response = await PUT(
      new Request('http://localhost/api/tests/batch', {
        method: 'PUT',
        body: JSON.stringify({
          ids: ['test-1', 'test-2'],
          status: 'DEPRECATED',
          source: 'IMPORTED',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.summary.succeeded).toBe(2);
    expect(prisma.test.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DEPRECATED',
          source: 'IMPORTED',
        }),
      })
    );
  });

  it('returns 400 when move target is inaccessible', async () => {
    (prisma.test.findMany as jest.Mock).mockResolvedValue([
      { id: 'test-1', projectId: 'project-1' },
    ]);
    (prisma.test.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/tests/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['test-1'],
          parentId: 'target-parent',
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });
});
