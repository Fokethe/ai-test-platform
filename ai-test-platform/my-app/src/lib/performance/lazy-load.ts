import { lazy, Suspense } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 组件懒加载封装
 * @param factory 动态导入工厂函数
 * @param options 配置选项
 * @returns 懒加载组件
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ReactNode;
    prefetch?: boolean;
  } = {}
) {
  const LazyComponent = lazy(factory);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={options.fallback || <div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * 图片懒加载 Hook
 * @param src 图片源
 * @param options 配置选项
 * @returns 图片加载状态和引用
 */
export function useLazyImage(
  src: string,
  options: {
    rootMargin?: string;
    threshold?: number;
  } = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  useEffect(() => {
    if (isInView && imgRef.current) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
    }
  }, [isInView, src]);

  return { imgRef, isLoaded, isInView };
}

/**
 * 数据懒加载 Hook
 * @param options 配置选项
 * @returns 数据加载状态和函数
 */
export function useLazyData<T>(
  options: {
    fetcher: () => Promise<T>;
    initialData?: T;
    threshold?: number;
  }
) {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (hasLoaded) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await options.fetcher();
      setData(result);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [options.fetcher, hasLoaded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          loadData();
        }
      },
      { threshold: options.threshold || 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [loadData, hasLoaded, options.threshold]);

  return { data, isLoading, error, ref, reload: loadData };
}

/**
 * 延迟加载 Hook
 * 在浏览器空闲时加载内容
 * @param callback 要执行的回调
 * @param options 配置选项
 */
export function useDeferredLoad(
  callback: () => void,
  options: {
    timeout?: number;
    enabled?: boolean;
  } = {}
) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (options.enabled === false) return;

    const id = requestIdleCallback(
      () => {
        callback();
        setIsReady(true);
      },
      { timeout: options.timeout || 2000 }
    );

    return () => cancelIdleCallback(id);
  }, [callback, options.timeout, options.enabled]);

  return isReady;
}

/**
 * 无限滚动 Hook
 * @param options 配置选项
 * @returns 滚动状态和引用
 */
export function useInfiniteScroll<T>(
  options: {
    fetcher: (page: number) => Promise<T[]>;
    hasMore: (data: T[]) => boolean;
    threshold?: number;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const newData = await options.fetcher(page);
      setData((prev) => [...prev, ...newData]);
      setPage((prev) => prev + 1);
      setHasMore(options.hasMore(newData));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore, options]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: options.threshold || 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading, options.threshold]);

  return { data, isLoading, hasMore, error, ref, loadMore };
}

/**
 * 预加载组件
 * @param factory 动态导入工厂函数
 */
export function preloadComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  factory();
}

/**
 * 预加载数据
 * @param fetcher 数据获取函数
 */
export function preloadData<T>(fetcher: () => Promise<T>) {
  return fetcher();
}
