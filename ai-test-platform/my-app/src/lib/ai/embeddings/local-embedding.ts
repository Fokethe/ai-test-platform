/**
 * Local Embedding Service
 * 本地bge-m3嵌入服务客户端
 * 
 * 功能：
 * 1. 调用本地bge-m3服务生成嵌入向量
 * 2. 支持批量处理
 * 3. 自动重试机制
 * 4. 健康检查
 */

import { EmbeddingService, EmbeddingConfig, EmbeddingError } from './types';

export interface LocalEmbeddingOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class LocalEmbeddingService implements EmbeddingService {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(options: LocalEmbeddingOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * 单条文本嵌入
   * @param text - 输入文本
   * @returns 嵌入向量
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  /**
   * 批量文本嵌入
   * @param texts - 文本列表
   * @returns 嵌入向量列表
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // 过滤空文本
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    if (validTexts.length === 0) {
      return texts.map(() => new Array(1024).fill(0));
    }

    return this.makeRequestWithRetry('/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: validTexts,
        normalize: true
      })
    });
  }

  /**
   * 健康检查
   * @returns 服务是否健康
   */
  async health(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<{
    model: string;
    dimensions: number;
    device: string;
  }> {
    const response = await fetch(`${this.baseUrl}/info`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new EmbeddingError('获取模型信息失败', 'MODEL_INFO_ERROR');
    }

    return response.json();
  }

  /**
   * 带重试的请求
   */
  private async makeRequestWithRetry(
    endpoint: string,
    options: RequestInit
  ): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.makeRequest(endpoint, options);
        return result.embeddings;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 最后一次尝试失败，抛出错误
        if (attempt === this.maxRetries) {
          break;
        }

        // 等待后重试
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw new EmbeddingError(
      `请求失败（重试${this.maxRetries}次）: ${lastError?.message}`,
      'REQUEST_FAILED'
    );
  }

  /**
   * 发起请求
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<{ embeddings: number[][]; latency_ms: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new EmbeddingError(
          `HTTP ${response.status}: ${errorText}`,
          'HTTP_ERROR'
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof EmbeddingError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new EmbeddingError('请求超时', 'TIMEOUT');
        }
        throw new EmbeddingError(error.message, 'NETWORK_ERROR');
      }
      
      throw new EmbeddingError('未知错误', 'UNKNOWN_ERROR');
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let defaultService: LocalEmbeddingService | null = null;

export function getLocalEmbeddingService(options?: LocalEmbeddingOptions): LocalEmbeddingService {
  if (!defaultService) {
    defaultService = new LocalEmbeddingService(options);
  }
  return defaultService;
}

export function resetLocalEmbeddingService(): void {
  defaultService = null;
}
