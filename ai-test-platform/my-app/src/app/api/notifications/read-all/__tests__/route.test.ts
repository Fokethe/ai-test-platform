import { POST } from '../route';
import { auth } from '@/lib/auth';
import { markAllNotificationsAsRead } from '../../_helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../../_helpers', () => ({
  markAllNotificationsAsRead: jest.fn(),
}));

describe('POST /api/notifications/read-all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks all notifications as read', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (markAllNotificationsAsRead as jest.Mock).mockResolvedValue(4);

    const response = await POST(
      new Request('http://localhost/api/notifications/read-all', { method: 'POST' }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('user-1');
    expect(payload.data.updatedCount).toBe(4);
  });
});
