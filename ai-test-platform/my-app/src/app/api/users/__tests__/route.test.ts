/**
 * Users API Tests
 * 用户管理API测试
 */

import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    workspaceMember: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

// 辅助函数：创建 NextRequest
function createNextRequest(url: string, options: RequestInit = {}): NextRequest {
  return new Request(url, options) as NextRequest;
}

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(new Request('http://localhost/api/users'));
      expect(response.status).toBe(401);
    });

    it('should return list of users for authenticated user', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUsers = [
        { id: '1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
        { id: '2', name: 'User', email: 'user@example.com', role: 'MEMBER', status: 'ACTIVE' },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const response = await GET(new Request('http://localhost/api/users'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Admin');
    });

    it('should support search query', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUsers = [{ id: '1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const response = await GET(new Request('http://localhost/api/users?search=admin'));
      expect(response.status).toBe(200);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('POST /api/users/invite', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await POST(new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', name: 'New User' }),
      }));
      expect(response.status).toBe(401);
    });

    it('should invite a new user', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockUser = {
        id: '2',
        name: 'New User',
        email: 'new@example.com',
        role: 'MEMBER',
        status: 'PENDING',
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await POST(new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', name: 'New User', role: 'MEMBER' }),
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.email).toBe('new@example.com');
    });

    it('should return 400 if email is missing', async () => {
      const mockSession = { user: { id: '1', email: 'admin@example.com' } };
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const response = await POST(new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'New User' }),
      }));

      expect(response.status).toBe(400);
    });
  });
});
