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
 */
export function listResponse<T>(data: T[], meta: ApiMeta) {
  return NextResponse.json({ data, meta });
}

/**
 * 成功单条响应
 */
export function itemResponse<T>(data: T) {
  return NextResponse.json({ data });
}

/**
 * 创建成功响应
 */
export function createdResponse<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * 无内容响应
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

/**
 * 错误响应
 */
export function errorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  status: number = 500,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, details } },
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
