/**
 * Cache Utilities
 * 缓存工具 - 提供内存缓存和 localStorage 缓存
 */

// 内存缓存
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl || this.defaultTTL),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  size(): number {
    return this.cache.size;
  }
}

// LocalStorage 缓存
class StorageCache {
  private prefix = 'app_cache_';
  private defaultTTL = 60 * 60 * 1000; // 1 hour

  private getKey(key: string): string {
    return this.prefix + key;
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiry: Date.now() + (ttl || this.defaultTTL),
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch (e) {
      // localStorage 可能已满，清除过期项后重试
      this.clearExpired();
      try {
        localStorage.setItem(this.getKey(key), JSON.stringify({
          data,
          expiry: Date.now() + (ttl || this.defaultTTL),
        }));
      } catch {
        // 忽略错误
      }
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const actualKey = key.slice(this.prefix.length);
        if (regex.test(actualKey)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  clearExpired(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item);
            if (Date.now() > entry.expiry) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// SWR 缓存配置
export const swrConfig = {
  // 数据在 5 分钟内被视为新鲜
  dedupingInterval: 5000,
  // 错误重试
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  // 聚焦时重新验证
  revalidateOnFocus: true,
  // 重新连接时重新验证
  revalidateOnReconnect: true,
  // 缓存清理间隔
  refreshInterval: 0,
};

// API 响应缓存键生成
export function generateCacheKey(prefix: string, params?: Record<string, any>): string {
  if (!params) return prefix;
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${prefix}?${sortedParams}`;
}

// 导出缓存实例
export const memoryCache = new MemoryCache();
export const storageCache = new StorageCache();

// 缓存装饰器（用于函数缓存）
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  const cache = new MemoryCache();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const cached = cache.get<ReturnType<T>>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

// 列表数据缓存策略
export const listCacheStrategy = {
  // 短期缓存（用于频繁更新的列表）
  shortTerm: { ttl: 30 * 1000, dedupingInterval: 2000 },
  // 中期缓存（用于普通列表）
  mediumTerm: { ttl: 5 * 60 * 1000, dedupingInterval: 5000 },
  // 长期缓存（用于不常更新的列表）
  longTerm: { ttl: 30 * 60 * 1000, dedupingInterval: 10000 },
};

// 清理缓存（在数据变更后调用）
export function invalidateCache(pattern: string): void {
  memoryCache.clearPattern(pattern);
  storageCache.clearPattern(pattern);
}

// 常用缓存键前缀
export const CACHE_KEYS = {
  TESTS: 'tests',
  RUNS: 'runs',
  ASSETS: 'assets',
  ISSUES: 'issues',
  PROJECTS: 'projects',
  WORKSPACES: 'workspaces',
  SYSTEMS: 'systems',
  INTEGRATIONS: 'integrations',
  INBOX: 'inbox',
  DASHBOARD: 'dashboard',
} as const;
