import { GET } from '../route';
import { auth } from '@/lib/auth';
import { fetchUnreadSnapshot } from '../../_helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../../_helpers', () => ({
  fetchUnreadSnapshot: jest.fn(),
}));

describe('GET /api/notifications/unread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/notifications/unread') as never);

    expect(response.status).toBe(401);
  });

  it('returns unread count and recent notifications', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (fetchUnreadSnapshot as jest.Mock).mockResolvedValue({
      unreadCount: 2,
      recentNotifications: [
        {
          id: 'n-1',
          title: 'Build complete',
          content: 'Execution done',
          type: 'EXECUTION',
          read: false,
          createdAt: '2026-03-20T00:00:00.000Z',
        },
      ],
    });

    const response = await GET(new Request('http://localhost/api/notifications/unread') as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.count).toBe(2);
    expect(payload.data.unreadCount).toBe(2);
    expect(payload.data.recentNotifications).toHaveLength(1);
  });
});
