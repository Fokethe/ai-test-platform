/**
 * API Client - 统一错误处理封装
 * TDD 绿阶段实现
 */

// 可覆盖的导航函数（便于测试）
export const navigation = {
  redirectToLogin: () => {
    window.location.href = '/login';
  },
  redirectToForbidden: () => {
    window.location.href = '/forbidden';
  },
};

export class ApiError extends Error {
  code: string;
  status?: number;
  details?: Record<string, string[]>;

  constructor(
    code: string,
    message: string,
    status?: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

interface RequestConfig {
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: RequestConfig = {
  retries: 3,
  retryDelay: 1000,
};

/**
 * 判断是否为网络错误（可重试）
 */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('failed');
  }
  return false;
}

/**
 * 统一请求处理
 */
async function request<T>(
  url: string,
  options: RequestInit,
  config: RequestConfig = {}
): Promise<T> {
  const { retries = 3 } = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;

  // 重试循环
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // 解析响应
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch {
        data = { code: response.status };
      }

      // 处理 401/403 跳转
      if (response.status === 401) {
        navigation.redirectToLogin();
        throw new ApiError('UNAUTHORIZED', '未授权', 401);
      }
      if (response.status === 403) {
        navigation.redirectToForbidden();
        throw new ApiError('FORBIDDEN', '禁止访问', 403);
      }

      // 处理错误响应
      if (!response.ok) {
        const errorCode = data.error?.code || `ERROR_${response.status}`;
        const errorMessage = data.error?.message || data.message || '请求失败';
        const error = new ApiError(
          errorCode,
          errorMessage,
          response.status,
          data.error?.details
        );
        console.error('[API Error]', {
          url,
          status: response.status,
          code: errorCode,
          message: errorMessage,
        });
        throw error;
      }

      return data.data as T;
    } catch (err) {
      lastError = err as Error;

      // 网络错误时重试
      if (isNetworkError(err)) {
        if (attempt < retries - 1) {
          continue; // 继续重试
        }
        const networkError = new ApiError(
          'NETWORK_ERROR',
          '网络连接失败',
          undefined
        );
        console.error('[API Error]', { url, code: 'NETWORK_ERROR' });
        throw networkError;
      }

      // 其他错误直接抛出
      if (err instanceof ApiError) {
        throw err;
      }

      // 未知错误
      const unknownError = new ApiError(
        'UNKNOWN_ERROR',
        (err as Error).message || '未知错误'
      );
      console.error('[API Error]', { url, error: err });
      throw unknownError;
    }
  }

  throw lastError || new ApiError('UNKNOWN_ERROR', '请求失败');
}

/**
 * API 客户端
 */
export const apiClient = {
  /**
   * GET 请求
   */
  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>(
      url,
      { method: 'GET' },
      config
    );
  },

  /**
   * POST 请求
   */
  post<T>(url: string, body: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(
      url,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      config
    );
  },

  /**
   * PUT 请求
   */
  put<T>(url: string, body: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(
      url,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      config
    );
  },

  /**
   * PATCH 请求
   */
  patch<T>(url: string, body: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(
      url,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      config
    );
  },

  /**
   * DELETE 请求
   */
  delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>(
      url,
      { method: 'DELETE' },
      config
    );
  },
};
