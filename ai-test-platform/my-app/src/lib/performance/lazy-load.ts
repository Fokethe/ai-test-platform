import * as React from 'react';

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
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(factory);
  
  const LazyWrapper: React.FC<React.ComponentProps<T>> = (props) => {
    return React.createElement(
      React.Suspense,
      { fallback: options.fallback || React.createElement('div', null, 'Loading...') },
      React.createElement(LazyComponent, props)
    );
  };
  
  return LazyWrapper;
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
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
  const [data, setData] = React.useState<T | undefined>(options.initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const loadData = React.useCallback(async () => {
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

  React.useEffect(() => {
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
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
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
  const [data, setData] = React.useState<T[]>([]);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const loadMore = React.useCallback(async () => {
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

  React.useEffect(() => {
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
