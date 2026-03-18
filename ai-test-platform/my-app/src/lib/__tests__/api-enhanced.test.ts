/**
 * API Enhanced Tests
 */
import { apiClient, ApiError } from '../api';

describe('api-enhanced', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  describe('ApiError', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('TEST_ERROR', 'Test error', 500, { detail: ['test'] });
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
    });
  });

  describe('apiClient', () => {
    it('should export apiClient', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe('function');
    });
  });
});