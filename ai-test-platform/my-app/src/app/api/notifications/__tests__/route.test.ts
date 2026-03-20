import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import {
  clearAllNotifications,
  fetchDashboardNotifications,
  markAllNotificationsAsRead,
} from '../_helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../_helpers', () => ({
  fetchDashboardNotifications: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  clearAllNotifications: jest.fn(),
}));

describe('/api/notifications route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/notifications') as never);

    expect(response.status).toBe(401);
  });

  it('GET returns compatibility payload for dashboard page', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (fetchDashboardNotifications as jest.Mock).mockResolvedValue({
      total: 1,
      unreadCount: 1,
      notifications: [
        {
          id: 'n-1',
          title: 'Build completed',
          message: 'Build #100 finished',
          type: 'success',
          read: false,
          createdAt: '2026-03-20T00:00:00.000Z',
        },
      ],
    });

    const response = await GET(
      new Request('http://localhost/api/notifications?page=1&pageSize=20') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.notifications).toHaveLength(1);
    expect(payload.unreadCount).toBe(1);
    expect(payload.data.list[0].message).toBe('Build #100 finished');
  });

  it('PUT marks all as read by default', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (markAllNotificationsAsRead as jest.Mock).mockResolvedValue(3);

    const response = await PUT(new Request('http://localhost/api/notifications', { method: 'PUT' }) as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('user-1');
    expect(payload.data.updatedCount).toBe(3);
  });

  it('PUT clear-all action clears notifications', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (clearAllNotifications as jest.Mock).mockResolvedValue(5);

    const response = await PUT(
      new Request('http://localhost/api/notifications?action=clear-all', { method: 'PUT' }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(clearAllNotifications).toHaveBeenCalledWith('user-1');
    expect(payload.data.deletedCount).toBe(5);
  });
});
