import { POST } from '../route';
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
    aiRequirement: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
  },
}));

describe('POST /api/requirements/[id]/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      testPoints: [{ id: 'tp-1' }, { id: 'tp-2' }],
    });
    (prisma.aiRequirement.update as jest.Mock).mockResolvedValue({
      id: 'req-1',
      version: 2,
      confirmedAt: new Date('2026-03-19T10:00:00.000Z'),
      confirmedBy: 'user-1',
      updatedAt: new Date('2026-03-19T10:00:00.000Z'),
    });
    (prisma.activity.create as jest.Mock).mockResolvedValue({ id: 'act-1' });
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/confirm', {
        method: 'POST',
        body: JSON.stringify({ testPointIds: ['tp-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid selected test points', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/confirm', {
        method: 'POST',
        body: JSON.stringify({ testPointIds: ['tp-404'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    expect(response.status).toBe(400);
  });

  it('confirms requirement and records activity', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/confirm', {
        method: 'POST',
        body: JSON.stringify({ testPointIds: ['tp-1'], notes: 'Reviewed' }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.isConfirmed).toBe(true);
    expect(payload.data.selectedTestPointCount).toBe(1);
    expect(prisma.activity.create).toHaveBeenCalled();
  });
});
