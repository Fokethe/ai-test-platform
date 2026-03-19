import bcrypt from 'bcryptjs';
import { POST } from '../route';
import { ensurePersonalWorkspace } from '@/lib/personal-workspace';
import { prisma } from '@/lib/prisma';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('@/lib/personal-workspace', () => ({
  ensurePersonalWorkspace: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('/api/auth/register route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when payload is invalid JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when email or password is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: 'Tester', email: '' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'tester@example.com', password: '123' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'tester@example.com', password: 'password123' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(409);
  });

  it('creates user and personal workspace in one transaction', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const txUserCreate = jest.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Tester',
      email: 'tester@example.com',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-19T00:00:00.000Z'),
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: {
          create: txUserCreate,
        },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tester',
          email: 'Tester@Example.COM',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'tester@example.com' },
      select: { id: true },
    });
    expect(txUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'tester@example.com',
        }),
      })
    );
    expect(ensurePersonalWorkspace).toHaveBeenCalledWith('user-1', {
      db: expect.any(Object),
      nameHint: 'Tester',
      email: 'tester@example.com',
    });
    expect(txUserCreate).toHaveBeenCalled();
  });

  it('returns 500 when transaction throws', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tester',
          email: 'tester@example.com',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(500);
  });
});
