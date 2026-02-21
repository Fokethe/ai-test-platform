'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { useSession } from 'next-auth/react';

// 标准响应格式
interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

// fetcher 函数
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `请求失败: ${res.status}`);
  }
  const data: ApiResponse<T> = await res.json();
  if (data.code !== 0) {
    throw new Error(data.message || '请求失败');
  }
  return data.data;
};

// 发送数据的 fetcher
const postFetcher = async <T>([url, body]: [string, unknown]): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `请求失败: ${res.status}`);
  }
  const data: ApiResponse<T> = await res.json();
  if (data.code !== 0) {
    throw new Error(data.message || '请求失败');
  }
  return data.data;
};

// 默认 SWR 配置
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,        // 窗口聚焦时不重新验证
  revalidateOnReconnect: true,     // 网络重连时重新验证
  dedupingInterval: 5000,          // 5秒内重复请求去重
  errorRetryCount: 3,              // 错误重试3次
  errorRetryInterval: 3000,        // 错误重试间隔3秒
  loadingTimeout: 10000,           // 加载超时10秒
};

// 通用数据获取 Hook
export function useApi<T>(
  url: string | null,
  config?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<T, Error>(
    url,
    fetcher,
    { ...defaultConfig, ...config }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    isError: !!error,
  };
}

// 带身份验证的数据获取
export function useAuthApi<T>(
  url: string | null,
  config?: SWRConfiguration
) {
  const { status } = useSession();
  
  const shouldFetch = status === 'authenticated' && url;
  
  return useApi<T>(shouldFetch ? url : null, config);
}

// 工作空间相关 API
export function useWorkspaces(config?: SWRConfiguration) {
  return useApi<{
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      createdAt: string;
      _count: { projects: number; members: number };
    }>;
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>('/api/workspaces', { ...defaultConfig, ...config });
}

export function useWorkspace(id: string | null, config?: SWRConfiguration) {
  return useApi<{
    id: string;
    name: string;
    description: string | null;
    members: Array<{
      user: { id: string; name: string | null; email: string; image: string | null };
      role: string;
    }>;
    _count: { projects: number };
  }>(id ? `/api/workspaces/${id}` : null, { ...defaultConfig, ...config });
}

// 项目相关 API
export function useProjects(workspaceId: string | null, config?: SWRConfiguration) {
  return useApi<{
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      createdAt: string;
      _count: { systems: number };
    }>;
  }>(workspaceId ? `/api/projects?workspaceId=${workspaceId}` : null, { ...defaultConfig, ...config });
}

// 测试用例相关 API
export function useTestCases(config?: SWRConfiguration) {
  return useApi<{
    list: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      isAiGenerated: boolean;
      page: { name: string; system: { name: string } };
    }>;
  }>('/api/testcases', { ...defaultConfig, ...config });
}

// 页面列表
export function usePages(config?: SWRConfiguration) {
  return useApi<{
    list: Array<{ id: string; name: string }>;
  }>('/api/pages', { ...defaultConfig, ...config });
}

// 执行历史相关 API
export function useExecutionStatus(config?: SWRConfiguration) {
  return useApi<{
    running: Array<{
      id: string;
      status: string;
      duration: number | null;
      startedAt: string | null;
      testCase: { id: string; title: string };
      run: { id: string; name: string | null };
    }>;
    recent: Array<{
      id: string;
      status: string;
      duration: number | null;
      completedAt: string | null;
      testCase: { id: string; title: string };
      run: { id: string; name: string | null };
    }>;
    stats: { running: number; passed: number; failed: number; pending: number };
  }>('/api/executions/status', { 
    ...defaultConfig, 
    refreshInterval: 5000,  // 每5秒自动刷新
    ...config 
  });
}

export function useExecution(id: string | null, config?: SWRConfiguration) {
  return useApi<{
    id: string;
    status: string;
    duration: number | null;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    testCase: {
      id: string;
      title: string;
      preCondition: string | null;
      steps: string[];
      expectation: string;
    };
    steps: Array<{
      id: string;
      action: string;
      status: string;
      duration: number | null;
    }>;
  }>(id ? `/api/executions/${id}` : null, { ...defaultConfig, ...config });
}

// 测试套件相关 API
export function useTestSuites(projectId: string | null, config?: SWRConfiguration) {
  return useApi<{
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      _count: { testCases: number };
    }>;
  }>(projectId ? `/api/test-suites?projectId=${projectId}` : null, { ...defaultConfig, ...config });
}

// 用户设置
export function useUserSettings(config?: SWRConfiguration) {
  return useApi<{
    emailNotify: boolean;
    darkMode: boolean;
    autoRun: boolean;
    twoFactorAuth: boolean;
  }>('/api/user/settings', { ...defaultConfig, ...config });
}

// 预加载函数（用于路由预加载）
export function preloadData(url: string) {
  // SWR 的预加载机制
  const { mutate } = useSWRConfig();
  mutate(url, fetcher(url), false);
}

// 导入 useSWRConfig
import { useSWRConfig } from 'swr';

// 导出刷新函数
export { mutate as globalMutate } from 'swr';
