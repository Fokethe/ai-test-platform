/**
 * Unified API Response Format
 * 统一 API 响应格式
 */

import { NextResponse } from 'next/server';

export interface ApiMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 成功列表响应
 * 返回统一格式: { code: 0, data: { list, pagination } }
 */
export function listResponse<T>(data: T[], meta: ApiMeta) {
  return NextResponse.json({
    code: 0,
    message: 'success',
    data: {
      list: data,
      pagination: meta,
    },
  });
}

/**
 * 成功单条响应
 * 返回统一格式: { code: 0, data }
 */
export function itemResponse<T>(data: T) {
  return NextResponse.json({
    code: 0,
    message: 'success',
    data,
  });
}

/**
 * 创建成功响应
 * 返回统一格式: { code: 0, data }
 */
export function createdResponse<T>(data: T) {
  return NextResponse.json({
    code: 0,
    message: 'success',
    data,
  }, { status: 201 });
}

/**
 * 无内容响应
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

/**
 * 404 未找到响应
 */
export function notFoundResponse(message = '资源不存在') {
  return errorResponse(message, 'NOT_FOUND', 404);
}

/**
 * 成功响应（用于详情页）
 * 返回统一格式: { code: 0, data, message? }
 */
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    code: 0,
    message: message || 'success',
    data,
  });
}

/**
 * 错误响应
 * 支持多种调用方式:
 * - errorResponse(message, status) - 简写方式
 * - errorResponse(message, code, status, details) - 完整方式
 */
export function errorResponse(
  message: string,
  codeOrStatus: string | number = 'INTERNAL_ERROR',
  statusOrDetails?: number | Record<string, unknown>,
  details?: Record<string, unknown>
) {
  // 判断第二个参数是status code还是error code
  if (typeof codeOrStatus === 'number') {
    // 简写方式: errorResponse(message, status)
    const status = codeOrStatus;
    return NextResponse.json(
      { code: status, error: { code: 'ERROR', message }, data: null },
      { status }
    );
  }
  
  // 完整方式
  const code = codeOrStatus;
  const status = typeof statusOrDetails === 'number' ? statusOrDetails : 500;
  const errorDetails = typeof statusOrDetails === 'object' ? statusOrDetails : details;
  
  return NextResponse.json(
    { code: status, error: { code, message, details: errorDetails }, data: null },
    { status }
  );
}

/**
 * 常见错误响应
 */
export const errors = {
  notFound: (resource = '资源') =>
    errorResponse(`${resource}不存在`, 'NOT_FOUND', 404),
  
  badRequest: (message = '请求参数错误') =>
    errorResponse(message, 'BAD_REQUEST', 400),
  
  unauthorized: () =>
    errorResponse('未授权', 'UNAUTHORIZED', 401),
  
  forbidden: () =>
    errorResponse('禁止访问', 'FORBIDDEN', 403),
  
  validationError: (details: Record<string, string[]>) =>
    errorResponse('参数验证失败', 'VALIDATION_ERROR', 400, details),
};

/**
 * 分页元数据构建
 */
export function buildMeta(
  total: number,
  page: number,
  pageSize: number
): ApiMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    total,
    page,
    pageSize,
    hasMore: page < totalPages,
    totalPages,
  };
}
