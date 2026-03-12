/**
 * Embedding Types
 * 嵌入服务类型定义
 */

// 嵌入服务接口
export interface EmbeddingService {
  /**
   * 单条文本嵌入
   */
  embed(text: string): Promise<number[]>;
  
  /**
   * 批量文本嵌入
   */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /**
   * 健康检查
   */
  health(): Promise<boolean>;
}

// 嵌入配置
export interface EmbeddingConfig {
  // 服务类型: 'local' | 'openai' | 'dashscope'
  type: 'local' | 'openai' | 'dashscope';
  
  // 本地服务配置
  local?: {
    baseUrl: string;
    timeout?: number;
    maxRetries?: number;
  };
  
  // OpenAI配置
  openai?: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
  };
  
  //  DashScope配置
  dashscope?: {
    apiKey: string;
    model?: string;
  };
  
  // 向量维度
  dimensions?: number;
  
  // 是否归一化
  normalize?: boolean;
}

// 嵌入错误
export class EmbeddingError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'EmbeddingError';
    this.code = code;
  }
}

// 嵌入结果
export interface EmbeddingResult {
  embedding: number[];
  text: string;
  index: number;
}

// 批量嵌入结果
export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens?: number;
  latencyMs: number;
}

// 相似度计算
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 欧氏距离
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}
