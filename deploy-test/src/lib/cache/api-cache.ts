/**
 * API Response Cache - API 响应缓存
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  createdAt: number;
  accessCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

export class APICache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private checkInterval: number;
  private maxSize: number;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options?: {
    stdTTL?: number;
    checkperiod?: number;
    maxKeys?: number;
  }) {
    this.cache = new Map();
    this.defaultTTL = (options?.stdTTL || 300) * 1000;
    this.checkInterval = (options?.checkperiod || 60) * 1000;
    this.maxSize = options?.maxKeys || 1000;
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0,
    };

    this.startCleanup();
  }
