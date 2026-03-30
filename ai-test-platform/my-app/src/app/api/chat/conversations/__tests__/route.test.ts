import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    chatConversation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('GET/POST /api/chat/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.chatConversation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.chatConversation.create as jest.Mock).mockResolvedValue({
      id: 'conv-1',
      title: '新对话',
      knowledgeScope: 'all',
      projectId: null,
      createdAt: new Date('2026-03-27T10:00:00Z'),
      updatedAt: new Date('2026-03-27T10:00:00Z'),
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/chat/conversations') as never);
    expect(res.status).toBe(401);
  });

  it('returns conversation list', async () => {
    (prisma.chatConversation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'conv-1',
        title: '会话 1',
        knowledgeScope: 'all',
        projectId: null,
        createdAt: new Date('2026-03-27T10:00:00Z'),
        updatedAt: new Date('2026-03-27T10:00:00Z'),
        messages: [],
      },
    ]);

    const res = await GET(new Request('http://localhost/api/chat/conversations?limit=10') as never);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.list).toHaveLength(1);
    expect(payload.data.list[0].id).toBe('conv-1');
  });

  it('creates conversation', async () => {
    const res = await POST(
      new Request('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: '新对话',
          knowledgeScope: 'all',
        }),
      }) as never
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.id).toBe('conv-1');
    expect(prisma.chatConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
        }),
      })
    );
  });
});
