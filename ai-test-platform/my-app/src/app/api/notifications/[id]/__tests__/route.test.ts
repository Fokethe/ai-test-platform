import { DELETE, PUT } from '../route';
import { auth } from '@/lib/auth';
import { deleteNotification, markNotificationAsRead } from '../../_helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../../_helpers', () => ({
  markNotificationAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

describe('/api/notifications/[id] route', () => {
  const params = { params: Promise.resolve({ id: 'n-1' }) } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PUT marks notification as read', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (markNotificationAsRead as jest.Mock).mockResolvedValue(true);

    const response = await PUT(
      new Request('http://localhost/api/notifications/n-1', { method: 'PUT' }) as never,
      params
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(markNotificationAsRead).toHaveBeenCalledWith('user-1', 'n-1');
    expect(payload.data.read).toBe(true);
  });

  it('DELETE removes notification', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (deleteNotification as jest.Mock).mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/notifications/n-1', { method: 'DELETE' }) as never,
      params
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deleteNotification).toHaveBeenCalledWith('user-1', 'n-1');
    expect(payload.data.deleted).toBe(true);
  });
});
