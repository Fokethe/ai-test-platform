/**
 * 语义缓存
 * 基于向量相似度的查询缓存
 */

export interface CacheEntry<T> {
  queryVector: number[];
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface SemanticCacheOptions {
  ttl?: number; // seconds
  similarityThreshold?: number;
}

export class SemanticCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;
  private options: Required<SemanticCacheOptions>;

  constructor(options: SemanticCacheOptions = {}) {
    this.options = {
      ttl: 3600,
      similarityThreshold: 0.95,
      ...options,
    };
  }

  /**
   * 获取缓存数据
   */
  async get(queryVector: number[]): Promise<T | null> {
    this.cleanup();
    
    for (const entry of this.cache.values()) {
      if (this.cosineSimilarity(queryVector, entry.queryVector) >= this.options.similarityThreshold) {
        this.hits++;
        return entry.data;
      }
    }
    
    this.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  async set(queryVector: number[], data: T): Promise<void> {
    const key = this.vectorToKey(queryVector);
    const now = Date.now();
    
    this.cache.set(key, {
      queryVector,
      data,
      timestamp: now,
      expiresAt: now + this.options.ttl * 1000,
    });
  }

  /**
   * 删除缓存
   */
  delete(queryVector: number[]): void {
    const key = this.vectorToKey(queryVector);
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取统计
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 向量转key
   */
  private vectorToKey(vector: number[]): string {
    return vector.map(v => Math.round(v * 1000)).join(',');
  }

  /**
   * 余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }
}

// 全局缓存实例
const caches: Map<string, SemanticCache> = new Map();

export function getSemanticCache<T>(name = 'default', options?: SemanticCacheOptions): SemanticCache<T> {
  if (!caches.has(name)) {
    caches.set(name, new SemanticCache<T>(options));
  }
  return caches.get(name) as SemanticCache<T>;
}

export default SemanticCache;
