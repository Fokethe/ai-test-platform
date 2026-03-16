/**
 * 语义缓存
 * 缓存相似查询结果以减少LLM调用
 */

export interface CacheEntry {
  query: string;
  embedding: number[];
  result: unknown;
  timestamp: number;
}

export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in ms

  constructor(maxSize = 100, ttl = 3600000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  async get(query: string, embedding: number[], similarityThreshold = 0.95): Promise<unknown | null> {
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttl) {
        continue;
      }
      
      const similarity = this.cosineSimilarity(embedding, entry.embedding);
      if (similarity >= similarityThreshold) {
        return entry.result;
      }
    }
    
    return null;
  }

  async set(query: string, embedding: number[], result: unknown): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const key = this.generateKey(query);
    this.cache.set(key, {
      query,
      embedding,
      result,
      timestamp: Date.now(),
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateKey(query: string): string {
    return query.toLowerCase().trim();
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
}

let globalCache: SemanticCache | null = null;

export function getSemanticCache(): SemanticCache {
  if (!globalCache) {
    globalCache = new SemanticCache();
  }
  return globalCache;
}
