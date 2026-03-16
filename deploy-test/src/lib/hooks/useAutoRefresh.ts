/**
 * useAutoRefresh Hook
 * 封装 SWR 自动刷新功能
 * - 手动刷新
 * - 定时30分钟刷新
 * - CRUD后自动刷新
 */

import { useCallback, useMemo } from 'react';
import useSWR, { SWRConfiguration, Key } from 'swr';

// 30分钟 = 30 * 60 * 1000 毫秒
const DEFAULT_REFRESH_INTERVAL = 30 * 60 * 1000;

export interface AutoRefreshOptions extends SWRConfiguration {
  /** 是否启用定时刷新 (默认: true) */
  enableAutoRefresh?: boolean;
  /** 自定义刷新间隔 (默认: 30分钟) */
  refreshInterval?: number;
}

export interface UseAutoRefreshReturn<T> {
  /** 数据 */
  data: T | undefined;
  /** 错误 */
  error: Error | undefined;
  /** 是否加载中 */
  isLoading: boolean;
  /** 是否验证中 */
  isValidating: boolean;
  /** 手动刷新函数 */
  refresh: () => Promise<T | undefined>;
  /** 原始的 mutate 函数 */
  mutate: ReturnType<typeof useSWR<T>>['mutate'];
}

/**
 * 自动刷新 Hook
 * @param key - SWR key
 * @param fetcher - 数据获取函数
 * @param options - 配置选项
 * @returns 数据和刷新控制
 * 
 * @example
 * const { data, error, isLoading, refresh } = useAutoRefresh(
 *   '/api/assets',
 *   fetcher,
 *   { refreshInterval: 30 * 60 * 1000 }
 * );
 * 
 * // 手动刷新
 * await refresh();
 * 
 * // CRUD 后自动刷新
 * await fetch('/api/assets', { method: 'POST', body: data });
 * await refresh();
 */
export function useAutoRefresh<T = any>(
  key: Key,
  fetcher: (url: string) => Promise<T>,
  options: AutoRefreshOptions = {}
): UseAutoRefreshReturn<T> {
  const {
    enableAutoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    ...swrOptions
  } = options;

  const swrConfig = useMemo<SWRConfiguration>(() => ({
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    ...(enableAutoRefresh && { refreshInterval }),
    ...swrOptions,
  }), [enableAutoRefresh, refreshInterval, swrOptions]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    fetcher,
    swrConfig
  );

  const refresh = useCallback(async () => {
    return await mutate();
  }, [mutate]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    mutate,
  };
}

export default useAutoRefresh;
