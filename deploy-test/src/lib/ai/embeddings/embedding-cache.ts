/**
 * Embedding Cache
 * 语义缓存层 - 基于查询意图的缓存
 */

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
  };
  private readonly ttl: number; // 毫秒
  private readonly maxSize: number;

  constructor(options: { ttl?: number; maxSize?: number } = {}) {
    this.ttl = options.ttl || 60 * 60 * 1000; // 默认1小时
    this.maxSize = options.maxSize || 1000;
  }

  /**
   * 生成缓存键
   * 使用文本的hash作为键
   */
  private generateKey(text: string): string {
    // 简单hash函数
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转为32位整数
    }
    return `emb_${hash}_${text.length}`;
  }

  /**
   * 获取缓存的embedding
   */
  get(text: string): number[] | null {
    this.stats.totalRequests++;
    const key = this.generateKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 命中缓存
    entry.hitCount++;
    this.stats.hits++;
    this.updateHitRate();
    return entry.embedding;
  }

  /**
   * 设置缓存
   */
  set(text: string, embedding: number[]): void {
    // 如果缓存已满，删除最老的条目
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(text);
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * 批量获取缓存
   */
  getBatch(texts: string[]): { cached: Map<number, number[]>; missing: number[] } {
    const cached = new Map<number, number[]>();
    const missing: number[] = [];

    texts.forEach((text, index) => {
      const embedding = this.get(text);
      if (embedding) {
        cached.set(index, embedding);
      } else {
        missing.push(index);
      }
    });

    return { cached, missing };
  }

  /**
   * 批量设置缓存
   */
  setBatch(texts: string[], embeddings: number[][]): void {
    texts.forEach((text, index) => {
      if (embeddings[index]) {
        this.set(text, embeddings[index]);
      }
    });
  }

  /**
   * 删除最老的缓存条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
    };
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
}

// 全局缓存实例
let globalCache: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!globalCache) {
    globalCache = new EmbeddingCache();
  }
  return globalCache;
}

export function resetEmbeddingCache(): void {
  globalCache = null;
}
