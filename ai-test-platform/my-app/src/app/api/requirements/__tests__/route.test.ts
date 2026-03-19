import { POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { persistRequirementIngestion } from '@/lib/requirements/ingestion';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/requirements/ingestion', () => ({
  persistRequirementIngestion: jest.fn(),
}));

describe('POST /api/requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (persistRequirementIngestion as jest.Mock).mockResolvedValue({
      id: 'req-1',
      projectId: 'project-1',
      title: 'User Login Requirement',
      features: ['User login'],
      businessRules: [],
      testPoints: [
        {
          id: 'tp-1',
          name: 'Login success',
          description: 'Valid login should succeed',
          priority: 'P0',
          relatedFeature: 'User login',
          order: 0,
        },
      ],
      testPointGroups: [
        {
          feature: 'User login',
          points: [
            {
              id: 'tp-1',
              name: 'Login success',
              description: 'Valid login should succeed',
              priority: 'P0',
              relatedFeature: 'User login',
              order: 0,
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
    });
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/requirements', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          content: 'User login requirement with OTP.',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 when projectId is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const response = await POST(
      new Request('http://localhost/api/requirements', {
        method: 'POST',
        body: JSON.stringify({
          content: 'User login requirement with OTP.',
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 when user has no project access', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/requirements', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          content: 'User login requirement with OTP.',
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('returns grouped test points after successful paste ingestion', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const response = await POST(
      new Request('http://localhost/api/requirements', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          title: 'User Login Requirement',
          content: 'User login requirement with OTP and password.',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.id).toBe('req-1');
    expect(payload.data.testPointGroups).toHaveLength(1);
    expect(payload.data.testPointGroups[0].feature).toBe('User login');
    expect(hasProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(persistRequirementIngestion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        createdBy: 'user-1',
      })
    );
  });
});

