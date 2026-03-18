/**
 * API 集成测试设置
 * 提供共享的测试工具和配置
 */
import { NextRequest } from 'next/server';

/**
 * 创建模拟的 NextRequest
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options;

  const request = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as NextRequest;

  // 添加 NextRequest 特有的属性
  Object.defineProperty(request, 'nextUrl', {
    value: new URL(url),
    writable: true,
    configurable: true,
  });

  return request;
}

/**
 * 解析 JSON 响应
 */
export async function parseJsonResponse(response: Response): Promise<unknown> {
  return response.json();
}

/**
 * API 测试超时配置
 */
export const API_TEST_TIMEOUT = 10000;

/**
 * 基础 API URL
 */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
