/**
 * LocalEmbeddingService Tests
 */

import { LocalEmbeddingService, getLocalEmbeddingService, resetLocalEmbeddingService } from '../local-embedding';
import { EmbeddingError } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('LocalEmbeddingService', () => {
  let service: LocalEmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLocalEmbeddingService();
    service = new LocalEmbeddingService({
      baseUrl: 'http://localhost:8000',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100
    });
  });

  describe('embed', () => {
    it('should return embedding for single text', async () => {
      const mockEmbedding = new Array(1024).fill(0.1);
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embeddings: [mockEmbedding],
          dimensions: 1024,
          latency_ms: 50
        })
      });

      const result = await service.embed('测试文本');

      expect(result).toHaveLength(1024);
      expect(result[0]).toBe(0.1);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/embed',
        expect.any(Object)
      );
    });

    it('should throw error on HTTP failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(service.embed('测试')).rejects.toThrow(EmbeddingError);
    });

    it('should retry on network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embeddings: [new Array(1024).fill(0)],
            latency_ms: 50
          })
        });

      const result = await service.embed('测试');
      expect(result).toHaveLength(1024);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('embedBatch', () => {
    it('should return embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        new Array(1024).fill(0.1),
        new Array(1024).fill(0.2)
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embeddings: mockEmbeddings,
          dimensions: 1024,
          latency_ms: 100
        })
      });

      const result = await service.embedBatch(['文本1', '文本2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1024);
      expect(result[1][0]).toBe(0.2);
    });

    it('should handle empty array', async () => {
      const result = await service.embedBatch([]);
      expect(result).toHaveLength(0);
    });

    it('should filter empty texts', async () => {
      const mockEmbedding = new Array(1024).fill(0.1);
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embeddings: [mockEmbedding],
          latency_ms: 50
        })
      });

      // 实现会过滤空文本，只对有效文本进行嵌入
      const result = await service.embedBatch(['', '有效文本', '']);

      // 只有 1 个有效文本，返回 1 个嵌入
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1024);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('有效文本')
        })
      );
    });
  });

  describe('health', () => {
    it('should return true when service is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await service.health();
      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await service.health();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.health();
      expect(result).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const service1 = getLocalEmbeddingService();
      const service2 = getLocalEmbeddingService();
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getLocalEmbeddingService();
      resetLocalEmbeddingService();
      const service2 = getLocalEmbeddingService();
      expect(service1).not.toBe(service2);
    });
  });
});
