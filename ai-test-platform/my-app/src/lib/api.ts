/**
 * API Client - 统一的 API 调用客户端
 */

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export const apiClient = {
  get<T>(url: string) {
    return request<T>(`${API_BASE}${url}`);
  },

  post<T>(url: string, body: any) {
    return request<T>(`${API_BASE}${url}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: any) {
    return request<T>(`${API_BASE}${url}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch<T>(url: string, body: any) {
    return request<T>(`${API_BASE}${url}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string) {
    return request<T>(`${API_BASE}${url}`, {
      method: 'DELETE',
    });
  },
};
