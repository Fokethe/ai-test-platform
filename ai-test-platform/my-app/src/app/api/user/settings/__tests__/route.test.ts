import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSettings: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('/api/user/settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('GET returns merged user settings payload', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      settings: {
        emailNotify: false,
        pushNotify: true,
        executionNotify: true,
        inviteNotify: false,
        systemNotify: true,
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.language).toBe('zh-CN');
    expect(payload.data.emailNotify).toBe(false);
  });

  it('PUT returns 400 for invalid language', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await PUT(
      new Request('http://localhost/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({ language: 'fr' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT updates language and notification settings', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (
        callback: (tx: {
          user: { update: jest.Mock; findUnique: jest.Mock };
          userSettings: { upsert: jest.Mock };
        }) => unknown
      ) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue(undefined),
            findUnique: jest.fn().mockResolvedValue({
              language: 'en',
              timezone: 'Asia/Shanghai',
              settings: {
                emailNotify: false,
                pushNotify: true,
                executionNotify: true,
                inviteNotify: true,
                systemNotify: true,
              },
            }),
          },
          userSettings: {
            upsert: jest.fn().mockResolvedValue(undefined),
          },
        })
    );

    const response = await PUT(
      new Request('http://localhost/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          language: 'en',
          emailNotify: false,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.language).toBe('en');
    expect(payload.data.emailNotify).toBe(false);
  });
});
