import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { ZodError } from 'zod';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
  error?: ApiError;
}

// 统一的成功响应
export function success<T>(data: T, message = 'success'): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code: 0,
    data,
    message,
  });
}

// 统一的错误响应
export function error(
  message: string,
  code = 500,
  details?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code,
      error: {
        code: String(code),
        message,
        details,
      },
    },
    { status: code }
  );
}

// 常用错误响应
export const errors = {
  unauthorized: () => error('未授权', 401),
  forbidden: () => error('禁止访问', 403),
  notFound: (resource = '资源') => error(`${resource}不存在`, 404),
  badRequest: (message = '请求参数错误') => error(message, 400),
  validationError: (err: ZodError) => {
    const details: Record<string, string[]> = {};
    err.issues.forEach((e) => {
      const path = e.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(e.message);
    });
    return error('参数验证失败', 400, details);
  },
  internalError: (message = '服务器内部错误') => error(message, 500),
};

// API 路由处理器包装器
type ApiHandler = (req: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return errors.unauthorized();
      }
      return handler(req, context);
    } catch (err) {
      console.error('API Error:', err);
      return errors.internalError();
    }
  };
}

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      console.error('API Error:', err);
      
      if (err instanceof ZodError) {
        return errors.validationError(err);
      }
      
      if (err instanceof Error) {
        return error(err.message, 500);
      }
      
      return errors.internalError();
    }
  };
}

// 组合中间件
export function withMiddleware(...middlewares: ((handler: ApiHandler) => ApiHandler)[]) {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * 解析 JSON 请求体
 * 统一处理解析错误，避免重复代码
 */
export async function parseJsonBody<T = unknown>(
  request: NextRequest
): Promise<{ success: true; data: T } | { success: false; error: ReturnType<typeof error> }> {
  try {
    const body = await request.json();
    return { success: true, data: body as T };
  } catch (error) {
    console.error('Failed to parse JSON body:', error);
    return { 
      success: false, 
      error: errors.badRequest('无效的 JSON 请求体') 
    };
  }
}

/**
 * 构建查询参数
 * 统一处理分页和过滤参数
 */
export function buildQueryParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

// 常用的 API 路由创建辅助函数
export function createApiRoute(handlers: {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
}) {
  return {
    GET: handlers.GET ? withErrorHandler(withAuth(handlers.GET)) : undefined,
    POST: handlers.POST ? withErrorHandler(withAuth(handlers.POST)) : undefined,
    PUT: handlers.PUT ? withErrorHandler(withAuth(handlers.PUT)) : undefined,
    PATCH: handlers.PATCH ? withErrorHandler(withAuth(handlers.PATCH)) : undefined,
    DELETE: handlers.DELETE ? withErrorHandler(withAuth(handlers.DELETE)) : undefined,
  };
}

/**
 * 安全解析 JSON 请求体
 * 解析失败返回默认值
 */
export async function safeParseJsonBody<T>(
  request: NextRequest,
  defaultValue: T
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 获取当前用户ID
 */
export function getCurrentUserId(): string {
  return 'system';
}

/**
 * API 处理器包装器
 */
export function wrapApiHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      console.error('API Error:', err);
      
      // 检查约束错误（唯一约束、外键约束）
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        if (message.includes('unique constraint') || message.includes('foreign key constraint')) {
          return error(err.message, 400);
        }
      }
      
      return errors.internalError();
    }
  };
}

/**
 * 获取查询参数
 */
export function getQueryParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue?: string
): string | undefined {
  return searchParams.get(key) || defaultValue;
}

/**
 * 获取必需的查询参数
 */
export function getRequiredQueryParam(
  searchParams: URLSearchParams,
  key: string
): { success: true; value: string } | { success: false; error: ReturnType<typeof error> } {
  const value = searchParams.get(key);
  if (!value) {
    return { success: false, error: errors.badRequest(`缺少必需参数: ${key}`) };
  }
  return { success: true, value };
}
