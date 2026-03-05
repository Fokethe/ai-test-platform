const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import { POST as createUser, GET as getUsers } from '../route';
import { NextRequest } from 'next/server';

describe('Users API - 邀请邮件', () => {
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
    return new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  }

  it('应该成功发送邀请邮件', async () => {
    mockSend.mockResolvedValue({ id: 'email-id-123' });

    const request = createMockRequest({
      email: 'newuser@test.com',
      invitationToken: 'invitation-token-123',
    });

    const response = await createUser(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('邀请邮件已发送');
  });

  it('应该在缺少参数时返回400错误', async () => {
    const request = createMockRequest({
      email: 'newuser@test.com',
    });

    const response = await createUser(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('缺少必要的参数');
  });

  it('应该在邮件发送失败时返回500错误', async () => {
    mockSend.mockRejectedValue(new Error('API 错误'));

    const request = createMockRequest({
      email: 'newuser@test.com',
      invitationToken: 'invitation-token-123',
    });

    const response = await createUser(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('邀请邮件发送失败');
  });

  it('应该支持获取用户列表', async () => {
    const response = await getUsers();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('用户列表API');
  });
});
