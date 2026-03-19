import { GET } from '../route';
import { auth } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

describe('/api/auth/me route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns current user info when session exists', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Tester',
        email: 'tester@example.com',
        role: 'USER',
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data).toEqual({
      id: 'user-1',
      name: 'Tester',
      email: 'tester@example.com',
      role: 'USER',
    });
  });
});
