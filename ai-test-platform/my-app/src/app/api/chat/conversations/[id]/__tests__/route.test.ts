import { DELETE, GET } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    chatConversation: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET/DELETE /api/chat/conversations/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.chatConversation.findFirst as jest.Mock).mockResolvedValue({
      id: 'conv-1',
      title: '会话 1',
      knowledgeScope: 'all',
      projectId: null,
      createdAt: new Date('2026-03-27T10:00:00Z'),
      updatedAt: new Date('2026-03-27T10:00:00Z'),
    });
    (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'm-2',
        role: 'ASSISTANT',
        content: '你好，我在',
        meta: null,
        createdAt: new Date('2026-03-27T10:00:02Z'),
      },
      {
        id: 'm-1',
        role: 'USER',
        content: '你好',
        meta: null,
        createdAt: new Date('2026-03-27T10:00:01Z'),
      },
    ]);
    (prisma.chatConversation.delete as jest.Mock).mockResolvedValue({ id: 'conv-1' });
  });

  it('returns conversation detail with messages', async () => {
    const res = await GET(
      new Request('http://localhost/api/chat/conversations/conv-1') as never,
      { params: Promise.resolve({ id: 'conv-1' }) }
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.id).toBe('conv-1');
    expect(payload.data.messages).toHaveLength(2);
    expect(payload.data.messages[0].role).toBe('user');
  });

  it('returns 404 when conversation missing', async () => {
    (prisma.chatConversation.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(
      new Request('http://localhost/api/chat/conversations/not-found') as never,
      { params: Promise.resolve({ id: 'not-found' }) }
    );

    expect(res.status).toBe(404);
  });

  it('deletes conversation', async () => {
    const res = await DELETE(
      new Request('http://localhost/api/chat/conversations/conv-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'conv-1' }) }
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.deleted).toBe(true);
    expect(prisma.chatConversation.delete).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
    });
  });
});
