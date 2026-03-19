import bcrypt from 'bcryptjs';
import { GET, PUT, DELETE } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('User Detail API', () => {
  const params = Promise.resolve({ id: 'user-1' });

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (writeAuditLog as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/users/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(new Request('http://localhost/api/users/user-1') as never, { params });
      expect(response.status).toBe(401);
    });

    it('returns 403 when non-admin reads another user', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-2', role: 'USER', email: 'u2@example.com' },
      });

      const response = await GET(new Request('http://localhost/api/users/user-1') as never, { params });
      expect(response.status).toBe(403);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORBIDDEN_USER_READ',
          targetId: 'user-1',
        })
      );
    });

    it('allows self-read for non-admin user', async () => {
      const selfParams = Promise.resolve({ id: 'user-2' });
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-2', role: 'USER', email: 'u2@example.com' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-2',
        email: 'u2@example.com',
        role: 'USER',
        status: 'ACTIVE',
      });

      const response = await GET(new Request('http://localhost/api/users/user-2') as never, {
        params: selfParams,
      });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('returns 403 for non-admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-2', role: 'USER', email: 'u2@example.com' },
      });

      const response = await PUT(
        new Request('http://localhost/api/users/user-1', {
          method: 'PUT',
          body: JSON.stringify({ role: 'ADMIN' }),
        }) as never,
        { params }
      );

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid role', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });

      const response = await PUT(
        new Request('http://localhost/api/users/user-1', {
          method: 'PUT',
          body: JSON.stringify({ role: 'MEMBER' }),
        }) as never,
        { params }
      );

      expect(response.status).toBe(400);
    });

    it('updates role and status for admin user', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'u1@example.com',
        role: 'USER',
        status: 'INACTIVE',
        name: 'User 1',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'u1@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const response = await PUT(
        new Request('http://localhost/api/users/user-1', {
          method: 'PUT',
          body: JSON.stringify({ role: 'ADMIN', status: 'ACTIVE' }),
        }) as never,
        { params }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.role).toBe('ADMIN');
      expect(payload.data.status).toBe('ACTIVE');
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_ADMIN_UPDATED',
          targetId: 'user-1',
        })
      );
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('returns 400 when admin deletes self', async () => {
      const selfParams = Promise.resolve({ id: 'admin-1' });
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });

      const response = await DELETE(new Request('http://localhost/api/users/admin-1') as never, {
        params: selfParams,
      });

      expect(response.status).toBe(400);
    });

    it('deletes user for admin', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const response = await DELETE(new Request('http://localhost/api/users/user-1') as never, {
        params,
      });

      expect(response.status).toBe(200);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETED',
          targetId: 'user-1',
        })
      );
    });
  });
});
