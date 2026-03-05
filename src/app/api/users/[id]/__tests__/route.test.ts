const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

describe('Users/[id] API - 密码重置邮件', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'noreply@test.com';
    process.env.APP_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createMockRequest(body: Record<string, unknown>): NextRequest {
    return new Request('http://localhost:3000/api/users/123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  }

  function createMockParams(id: string) {
    return { params: { id } };
}

  it('应该成功发送密码重置邮件', async () => {
    mockSend.mockResolvedValue({ id: 'reset-email-id-123' });

    const request = createMockRequest({
      email: 'user@test.com',
      resetToken: 'reset-token-456',
    });
    const params = createMockParams('123');

    const response = await POST(request, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('密码重置邮件已发送');
  });

  it('应该在缺少参数时返回400错误', async () => {
    const request = createMockRequest({
      email: 'user@test.com',
    });
    const params = createMockParams('123');

    const response = await POST(request, params);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('缺少必要的参数');
  });

  it('应该在邮件发送失败时返回500错误', async () => {
    mockSend.mockRejectedValue(new Error('API 错误'));

    const request = createMockRequest({
      email: 'user@test.com',
      resetToken: 'reset-token-456',
    });
    const params = createMockParams('123');

    const response = await POST(request, params);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('密码重置邮件发送失败');
  });

  it('应该支持获取用户详情', async () => {
    const request = createMockRequest({});
    const params = createMockParams('123');

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('用户详情API');
    expect(data.userId).toBe('123');
  });
});
