/**
 * Embeddings Module
 * 嵌入服务统一入口
 */

import { EmbeddingService, EmbeddingConfig } from './types';
import { LocalEmbeddingService } from './local-embedding';

// 重新导出
export * from './types';
export * from './local-embedding';

// 嵌入服务工厂
export function createEmbeddingService(config: EmbeddingConfig): EmbeddingService {
  switch (config.type) {
    case 'local':
      return new LocalEmbeddingService({
        baseUrl: config.local?.baseUrl,
        timeout: config.local?.timeout,
        maxRetries: config.local?.maxRetries
      });
    
    // TODO: 实现其他嵌入服务
    case 'openai':
      throw new Error('OpenAI嵌入服务尚未实现');
    
    case 'dashscope':
      throw new Error('DashScope嵌入服务尚未实现');
    
    default:
      throw new Error(`未知的嵌入服务类型: ${config.type}`);
  }
}

// 默认配置
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  type: 'local',
  local: {
    baseUrl: process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000',
    timeout: 30000,
    maxRetries: 3
  },
  dimensions: 1024,
  normalize: true
};

// 获取默认嵌入服务
export function getDefaultEmbeddingService(): EmbeddingService {
  return createEmbeddingService(DEFAULT_EMBEDDING_CONFIG);
}
