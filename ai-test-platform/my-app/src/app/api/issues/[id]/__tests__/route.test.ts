import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    issue: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('GET /api/issues/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/issues/issue-1') as never,
      { params: Promise.resolve({ id: 'issue-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 when issue does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/issues/issue-1') as never,
      { params: Promise.resolve({ id: 'issue-1' }) }
    );

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/issues/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 when status transition is invalid', async () => {
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      projectId: 'project-1',
      status: 'CLOSED',
      resolvedAt: new Date('2026-03-20T00:00:00.000Z'),
    });

    const response = await PUT(
      new Request('http://localhost/api/issues/issue-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'OPEN' }),
      }) as never,
      { params: Promise.resolve({ id: 'issue-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.message).toContain('Invalid status transition');
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it('returns 400 when status is invalid', async () => {
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      projectId: 'project-1',
      status: 'OPEN',
      resolvedAt: null,
    });

    const response = await PUT(
      new Request('http://localhost/api/issues/issue-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      }) as never,
      { params: Promise.resolve({ id: 'issue-1' }) }
    );

    expect(response.status).toBe(400);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it('updates issue when status transition is allowed', async () => {
    (prisma.issue.findUnique as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      projectId: 'project-1',
      status: 'OPEN',
      resolvedAt: null,
    });
    (prisma.issue.update as jest.Mock).mockResolvedValue({
      id: 'issue-1',
      status: 'IN_PROGRESS',
    });

    const response = await PUT(
      new Request('http://localhost/api/issues/issue-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }) as never,
      { params: Promise.resolve({ id: 'issue-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('IN_PROGRESS');
    expect(prisma.issue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'issue-1' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
        }),
      })
    );
  });
});
