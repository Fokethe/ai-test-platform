/**
 * API错误处理器
 * 统一处理API路由中的错误，包括数据库连接失败等
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// 错误类型枚举
export enum ApiErrorType {
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  INTERNAL = 'INTERNAL',
}

// API错误类
export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 数据库连接错误
export class DatabaseConnectionError extends ApiError {
  constructor(message = '数据库连接失败') {
    super(ApiErrorType.DATABASE_CONNECTION, message, 503);
  }
}

// 数据库超时错误
export class DatabaseTimeoutError extends ApiError {
  constructor(message = '数据库查询超时') {
    super(ApiErrorType.DATABASE_TIMEOUT, message, 504);
  }
}

// 未找到错误
export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(ApiErrorType.NOT_FOUND, `${resource}不存在`, 404);
  }
}

// 验证错误
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ApiErrorType.VALIDATION, message, 400, details);
  }
}

// 认证错误
export class AuthenticationError extends ApiError {
  constructor(message = '未授权访问') {
    super(ApiErrorType.AUTHENTICATION, message, 401);
  }
}

// 授权错误
export class AuthorizationError extends ApiError {
  constructor(message = '权限不足') {
    super(ApiErrorType.AUTHORIZATION, message, 403);
  }
}

// 错误响应格式
interface ErrorResponse {
  success: false;
  error: {
    type: ApiErrorType;
    message: string;
    details?: Record<string, unknown>;
  };
  retryAfter?: number;
}

// 处理API错误
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // 如果是已知API错误
  if (error instanceof ApiError) {
    // 记录到Sentry（非客户端错误）
    if (error.statusCode >= 500) {
      Sentry.captureException(error);
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        type: error.type,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    };

    // 数据库连接错误添加重试建议
    if (error.type === ApiErrorType.DATABASE_CONNECTION) {
      response.retryAfter = 5;
    }

    return NextResponse.json(response, {
      status: error.statusCode,
      headers: error.type === ApiErrorType.DATABASE_CONNECTION
        ? { 'Retry-After': '5' }
        : undefined,
    });
  }

  // Prisma连接错误
  if (error instanceof Error && error.message?.includes('P1001')) {
    const dbError = new DatabaseConnectionError('无法连接到数据库服务器');
    return handleApiError(dbError);
  }

  // Prisma超时错误
  if (error instanceof Error && error.message?.includes('P1008')) {
    const timeoutError = new DatabaseTimeoutError();
    return handleApiError(timeoutError);
  }

  // 未知错误
  console.error('Unhandled API error:', error);
  Sentry.captureException(error);

  return NextResponse.json(
    {
      success: false,
      error: {
        type: ApiErrorType.INTERNAL,
        message: '服务器内部错误',
      },
    },
    { status: 500 }
  );
}

// API路由包装器
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error) as ReturnType<T>;
    }
  }) as T;
}

// 检查数据库连接
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
