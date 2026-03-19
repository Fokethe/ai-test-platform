import { GET, POST } from '../route';
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
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('GET /api/requirements/[id]/test-points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1/test-points') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 when requirement does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1/test-points') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(404);
  });

  it('returns grouped test points for accessible requirement', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      version: 3,
    });
    (prisma.testPoint.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'tp-1',
        name: 'Login',
        description: 'desc',
        priority: 'P0',
        relatedFeature: 'Auth',
        order: 0,
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/requirements/req-1/test-points') as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.version).toBe(3);
    expect(payload.data.testPointGroups[0].feature).toBe('Auth');
  });
});

describe('POST /api/requirements/[id]/test-points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.aiRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      version: 1,
    });
    (prisma.testPoint.aggregate as jest.Mock).mockResolvedValue({
      _max: { order: 3 },
    });
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/test-points', {
        method: 'POST',
        body: JSON.stringify({ priority: 'P0' }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('creates test point and increments requirement version', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
      callback({
        testPoint: {
          create: jest.fn().mockResolvedValue({
            id: 'tp-2',
            name: 'Login failure',
            description: 'negative',
            priority: 'P1',
            relatedFeature: 'Auth',
            order: 4,
          }),
        },
        aiRequirement: {
          update: jest.fn().mockResolvedValue({ version: 2 }),
        },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/test-points', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Login failure',
          description: 'negative',
          priority: 'P1',
          relatedFeature: 'Auth',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe('tp-2');
    expect(payload.data.requirementVersion).toBe(2);
  });
});
