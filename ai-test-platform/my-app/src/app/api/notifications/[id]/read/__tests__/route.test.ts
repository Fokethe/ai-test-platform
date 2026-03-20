import { POST } from '../route';
import { auth } from '@/lib/auth';
import { markNotificationAsRead } from '../../../_helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('../../../_helpers', () => ({
  markNotificationAsRead: jest.fn(),
}));

describe('POST /api/notifications/[id]/read', () => {
  const params = { params: Promise.resolve({ id: 'n-1' }) } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks notification as read', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (markNotificationAsRead as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/notifications/n-1/read', { method: 'POST' }) as never,
      params
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(markNotificationAsRead).toHaveBeenCalledWith('user-1', 'n-1');
    expect(payload.data.read).toBe(true);
  });
});
