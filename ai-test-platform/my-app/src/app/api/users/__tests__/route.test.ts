import bcrypt from 'bcryptjs';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (writeAuditLog as jest.Mock).mockResolvedValue(undefined);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  describe('GET /api/users', () => {
    it('returns 401 when unauthenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(new Request('http://localhost/api/users') as never);
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', role: 'USER', email: 'user@example.com' },
      });

      const response = await GET(new Request('http://localhost/api/users') as never);
      expect(response.status).toBe(403);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORBIDDEN_USER_MANAGEMENT',
          targetId: 'list',
        })
      );
    });

    it('returns user list for admin', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'u-1', email: 'a@example.com', role: 'ADMIN', status: 'ACTIVE' },
      ]);

      const response = await GET(new Request('http://localhost/api/users') as never);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.code).toBe(0);
      expect(payload.data).toHaveLength(1);
    });
  });

  describe('POST /api/users', () => {
    it('returns 403 for non-admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', role: 'USER', email: 'user@example.com' },
      });

      const response = await POST(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com' }),
        }) as never
      );

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid email', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });

      const response = await POST(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid-email' }),
        }) as never
      );

      expect(response.status).toBe(400);
    });

    it('creates inactive user with normalized email for admin', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-2',
        name: 'New User',
        email: 'new@example.com',
        role: 'USER',
        status: 'INACTIVE',
      });

      const response = await POST(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({
            email: 'New@Example.com',
            name: 'New User',
            role: 'USER',
          }),
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.email).toBe('new@example.com');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            role: 'USER',
            status: 'INACTIVE',
            password: 'hashed-password',
          }),
        })
      );
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_INVITED',
          targetId: 'user-2',
        })
      );
    });
  });
});
