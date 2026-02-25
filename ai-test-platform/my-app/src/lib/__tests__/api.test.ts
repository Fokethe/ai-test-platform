/**
 * API Client Tests - TDD Phase
 * 测试目标: lib/api.ts 客户端 API 封装
 */

import { apiClient, ApiError, navigation } from '../api';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock navigation
const mockRedirectToLogin = jest.fn();
const mockRedirectToForbidden = jest.fn();
navigation.redirectToLogin = mockRedirectToLogin;
navigation.redirectToForbidden = mockRedirectToForbidden;

describe('apiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockRedirectToLogin.mockClear();
    mockRedirectToForbidden.mockClear();
  });

  describe('基础请求', () => {
    it('should make successful GET request and return data', async () => {
      // Arrange
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: mockData, message: 'success' }),
      } as Response);

      // Act
      const result = await apiClient.get('/api/test');

      // Assert
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should make POST request with body', async () => {
      // Arrange
      const requestBody = { name: 'Test' };
      const mockData = { id: 1, ...requestBody };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ code: 0, data: mockData, message: 'created' }),
      } as Response);

      // Act
      const result = await apiClient.post('/api/test', requestBody);

      // Assert
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    });
  });

  describe('错误处理 - 统一格式', () => {
    it('should throw ApiError with structured error on 400', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 400,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { name: ['Required'] } },
        }),
      } as Response);

      // Act & Assert
      try {
        await apiClient.get('/api/test');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe('VALIDATION_ERROR');
        expect((err as ApiError).status).toBe(400);
        expect((err as ApiError).details).toEqual({ name: ['Required'] });
      }
    });

    it('should throw generic error on 500', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: 'Internal error' }),
      } as Response);

      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('401/403 自动跳转', () => {
    it('should redirect to /login on 401', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, message: 'Unauthorized' }),
      } as Response);

      // Act
      await expect(apiClient.get('/api/test')).rejects.toThrow();

      // Assert
      expect(mockRedirectToLogin).toHaveBeenCalled();
    });

    it('should redirect to /forbidden on 403', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ code: 403, message: 'Forbidden' }),
      } as Response);

      // Act
      await expect(apiClient.get('/api/test')).rejects.toThrow();

      // Assert
      expect(mockRedirectToForbidden).toHaveBeenCalled();
    });
  });

  describe('自动重试机制', () => {
    it('should retry on network error then fail', async () => {
      // Arrange - 3 次网络错误
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockRejectedValueOnce(new TypeError('fetch failed'));

      // Act & Assert
      await expect(apiClient.get('/api/test', { retries: 3 })).rejects.toBeInstanceOf(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should succeed on retry after network error', async () => {
      // Arrange - 第2次成功
      const mockData = { success: true };
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ code: 0, data: mockData, message: 'success' }),
        } as Response);

      // Act
      const result = await apiClient.get('/api/test', { retries: 3 });

      // Assert
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 400, message: 'Bad request' }),
      } as Response);

      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ApiError class', () => {
  it('should create error with all properties', () => {
    const error = new ApiError('TEST_ERROR', 'Test message', 400, { field: ['error'] });
    
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: ['error'] });
  });

  it('should be instance of Error', () => {
    const error = new ApiError('CODE', 'Message');
    expect(error).toBeInstanceOf(Error);
  });
});
