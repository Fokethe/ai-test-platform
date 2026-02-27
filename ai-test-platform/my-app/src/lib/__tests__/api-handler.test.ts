/**
 * API Handler Tests
 * 测试目标: lib/api-handler.ts 统一请求处理工具
 */

import { NextRequest } from 'next/server';
import {
  parseJsonBody,
  safeParseJsonBody,
  getCurrentUserId,
  wrapApiHandler,
  buildQueryParams,
  getQueryParam,
  getRequiredQueryParam,
} from '../api-handler';

describe('parseJsonBody', () => {
  it('should parse valid JSON body', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: 'Test', value: 123 }),
    } as unknown as NextRequest;

    const result = await parseJsonBody(mockRequest);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Test', value: 123 });
    }
  });

  it('should return error for invalid JSON', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as NextRequest;

    const result = await parseJsonBody(mockRequest);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should parse with type generic', async () => {
    interface TestData {
      id: string;
      count: number;
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ id: 'abc', count: 5 }),
    } as unknown as NextRequest;

    const result = await parseJsonBody<TestData>(mockRequest);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('abc');
      expect(result.data.count).toBe(5);
    }
  });
});

describe('safeParseJsonBody', () => {
  it('should return parsed data on success', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ name: 'Test' }),
    } as unknown as NextRequest;

    const result = await safeParseJsonBody(mockRequest, { default: true });

    expect(result).toEqual({ name: 'Test' });
  });

  it('should return default value on parse error', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Parse error')),
    } as unknown as NextRequest;

    const defaultValue = { default: true, items: [] };
    const result = await safeParseJsonBody(mockRequest, defaultValue);

    expect(result).toEqual(defaultValue);
  });
});

describe('getCurrentUserId', () => {
  it('should return system as default user id', () => {
    const userId = getCurrentUserId();
    expect(userId).toBe('system');
  });

  it('should return consistent value across multiple calls', () => {
    const id1 = getCurrentUserId();
    const id2 = getCurrentUserId();
    expect(id1).toBe(id2);
  });
});

describe('wrapApiHandler', () => {
  it('should return successful response', async () => {
    const handler = jest.fn().mockResolvedValue(Response.json({ success: true }));
    const wrapped = wrapApiHandler(handler);

    const result = await wrapped();

    expect(result).toBeInstanceOf(Response);
    expect(handler).toHaveBeenCalled();
  });

  it('should handle errors and return error response', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Test error'));
    const wrapped = wrapApiHandler(handler);

    const result = await wrapped();

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(500);
  });

  it('should handle unique constraint errors', async () => {
    const error = new Error('Unique constraint failed');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = wrapApiHandler(handler);

    const result = await wrapped();

    expect(result.status).toBe(400);
  });

  it('should handle foreign key constraint errors', async () => {
    const error = new Error('Foreign key constraint failed');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = wrapApiHandler(handler);

    const result = await wrapped();

    expect(result.status).toBe(400);
  });

  it('should pass arguments to handler', async () => {
    const handler = jest.fn().mockResolvedValue(Response.json({ success: true }));
    const wrapped = wrapApiHandler(handler);
    const arg1 = 'test';
    const arg2 = 123;

    await wrapped(arg1, arg2);

    expect(handler).toHaveBeenCalledWith(arg1, arg2);
  });
});

describe('buildQueryParams', () => {
  it('should build default params when no search params', () => {
    const searchParams = new URLSearchParams();
    const result = buildQueryParams(searchParams);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('should parse page and pageSize from search params', () => {
    const searchParams = new URLSearchParams('page=3&pageSize=50');
    const result = buildQueryParams(searchParams);

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(100); // (3-1) * 50
    expect(result.take).toBe(50);
  });

  it('should limit pageSize to maximum 100', () => {
    const searchParams = new URLSearchParams('pageSize=200');
    const result = buildQueryParams(searchParams);

    expect(result.pageSize).toBe(100);
    expect(result.take).toBe(100);
  });

  it('should ensure minimum page is 1', () => {
    const searchParams = new URLSearchParams('page=0');
    const result = buildQueryParams(searchParams);

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should ensure minimum pageSize is 1', () => {
    const searchParams = new URLSearchParams('pageSize=0');
    const result = buildQueryParams(searchParams);

    expect(result.pageSize).toBe(1);
    expect(result.take).toBe(1);
  });
});

describe('getQueryParam', () => {
  it('should return param value when exists', () => {
    const searchParams = new URLSearchParams('key=value&other=test');
    const result = getQueryParam(searchParams, 'key');

    expect(result).toBe('value');
  });

  it('should return undefined when param does not exist', () => {
    const searchParams = new URLSearchParams('other=test');
    const result = getQueryParam(searchParams, 'missing');

    expect(result).toBeUndefined();
  });

  it('should return default value when param does not exist', () => {
    const searchParams = new URLSearchParams('other=test');
    const result = getQueryParam(searchParams, 'missing', 'default');

    expect(result).toBe('default');
  });

  it('should return actual value even when default is provided', () => {
    const searchParams = new URLSearchParams('key=actual');
    const result = getQueryParam(searchParams, 'key', 'default');

    expect(result).toBe('actual');
  });
});

describe('getRequiredQueryParam', () => {
  it('should return success with value when param exists', () => {
    const searchParams = new URLSearchParams('id=123');
    const result = getRequiredQueryParam(searchParams, 'id');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('123');
    }
  });

  it('should return error when param does not exist', () => {
    const searchParams = new URLSearchParams('other=value');
    const result = getRequiredQueryParam(searchParams, 'required');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should return error for empty string value', () => {
    const searchParams = new URLSearchParams('empty=');
    const result = getRequiredQueryParam(searchParams, 'empty');

    expect(result.success).toBe(false);
  });
});
