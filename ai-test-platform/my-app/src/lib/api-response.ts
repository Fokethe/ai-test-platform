export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export function successResponse<T>(data: T, message = 'success'): ApiResponse<T> {
  return {
    code: 0,
    data,
    message,
  };
}

export function errorResponse(message: string, code = 1000): ApiResponse<null> {
  return {
    code,
    data: null,
    message,
  };
}

export function notFoundResponse(resource = '资源'): ApiResponse<null> {
  return {
    code: 1001,
    data: null,
    message: `${resource}不存在`,
  };
}

export function forbiddenResponse(): ApiResponse<null> {
  return {
    code: 1003,
    data: null,
    message: '权限不足',
  };
}

export function unauthorizedResponse(): ApiResponse<null> {
  return {
    code: 1004,
    data: null,
    message: '未登录',
  };
}
