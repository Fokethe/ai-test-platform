import { DELETE, PUT } from '../route';
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
    },
    testPoint: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('PUT /api/requirements/[id]/test-points/[testPointId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
    });
    (prisma.testPoint.findFirst as jest.Mock).mockResolvedValue({ id: 'tp-1' });
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await PUT(
      new Request('http://localhost/api/requirements/req-1/test-points/tp-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1', testPointId: 'tp-1' }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when test point does not exist', async () => {
    (prisma.testPoint.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await PUT(
      new Request('http://localhost/api/requirements/req-1/test-points/tp-404', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1', testPointId: 'tp-404' }) }
    );
    expect(response.status).toBe(404);
  });

  it('updates test point and increments version', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
      callback({
        testPoint: {
          update: jest.fn().mockResolvedValue({
            id: 'tp-1',
            name: 'Updated name',
            description: 'desc',
            priority: 'P0',
            relatedFeature: 'Auth',
            order: 1,
          }),
        },
        aiRequirement: {
          update: jest.fn().mockResolvedValue({ version: 3 }),
        },
      })
    );

    const response = await PUT(
      new Request('http://localhost/api/requirements/req-1/test-points/tp-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated name', priority: 'P0' }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1', testPointId: 'tp-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.requirementVersion).toBe(3);
    expect(payload.data.name).toBe('Updated name');
  });
});

describe('DELETE /api/requirements/[id]/test-points/[testPointId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
    });
    (prisma.testPoint.findFirst as jest.Mock).mockResolvedValue({ id: 'tp-1' });
  });

  it('deletes test point and increments version', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
      callback({
        testPoint: {
          delete: jest.fn().mockResolvedValue({ id: 'tp-1' }),
        },
        aiRequirement: {
          update: jest.fn().mockResolvedValue({ version: 4 }),
        },
      })
    );

    const response = await DELETE(
      new Request('http://localhost/api/requirements/req-1/test-points/tp-1', {
        method: 'DELETE',
      }) as never,
      { params: Promise.resolve({ id: 'req-1', testPointId: 'tp-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.deleted).toBe(true);
    expect(payload.data.requirementVersion).toBe(4);
  });
});
