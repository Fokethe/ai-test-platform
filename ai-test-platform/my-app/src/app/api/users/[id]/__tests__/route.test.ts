/**
 * User Detail API Tests
 * 用户详情API测试
 */

import { GET, PUT, DELETE } from '../route';
import { prisma } from '@/lib/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

describe('User Detail API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = Promise.resolve({ id: 'user-1' });

  describe('GET /api/users/[id]', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/users/user-1'),
        { params: mockParams }
      );
      expect(response.status).toBe(401);
    });

    it('should return user details', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await GET(
        new Request('http://localhost/api/users/user-1'),
        { params: mockParams }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.name).toBe('Test User');
    });

    it('should return 404 if user not found', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/users/user-1'),
        { params: mockParams }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('should update user role', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await PUT(
        new Request('http://localhost/api/users/user-1', {
          method: 'PUT',
          body: JSON.stringify({ role: 'ADMIN' }),
        }),
        { params: mockParams }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.role).toBe('ADMIN');
    });

    it('should reset user password', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await PUT(
        new Request('http://localhost/api/users/user-1', {
          method: 'PUT',
          body: JSON.stringify({ resetPassword: true }),
        }),
        { params: mockParams }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should delete user', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const response = await DELETE(
        new Request('http://localhost/api/users/user-1'),
        { params: mockParams }
      );

      expect(response.status).toBe(200);
    });

    it('should prevent self-deletion', async () => {
      const mockSession = { user: { id: 'user-1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const response = await DELETE(
        new Request('http://localhost/api/users/user-1'),
        { params: mockParams }
      );

      expect(response.status).toBe(400);
    });
  });
});
