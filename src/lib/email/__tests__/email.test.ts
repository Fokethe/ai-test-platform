const mockSend = jest.fn();

// Mock the resend module
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import { sendInvitationEmail, sendPasswordResetEmail } from '../email';

describe('邮件服务', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendInvitationEmail', () => {
    it('应该发送邀请邮件', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.FROM_EMAIL = 'noreply@test.com';
      process.env.APP_URL = 'http://localhost:3000';

      mockSend.mockResolvedValue({ id: 'test-email-id' });

      const result = await sendInvitationEmail('user@test.com', 'invitation-token-123');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@test.com',
        subject: '邀请您加入AI测试平台',
        html: expect.stringContaining('invitation-token-123'),
      });
      expect(result).toEqual({ success: true, id: 'test-email-id' });
    });

    it('应该在缺少API key时抛出错误', async () => {
      delete process.env.RESEND_API_KEY;

      await expect(
        sendInvitationEmail('user@test.com', 'invitation-token-123')
      ).rejects.toThrow('RESEND_API_KEY 环境变量未设置');
    });

    it('应该在邮件发送失败时抛出错误', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      mockSend.mockRejectedValue(new Error('API 错误'));

      await expect(
        sendInvitationEmail('user@test.com', 'invitation-token-123')
      ).rejects.toThrow('邀请邮件发送失败');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('应该发送密码重置邮件', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.FROM_EMAIL = 'noreply@test.com';
      process.env.APP_URL = 'http://localhost:3000';

      mockSend.mockResolvedValue({ id: 'reset-email-id' });

      const result = await sendPasswordResetEmail('user@test.com', 'reset-token-456');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@test.com',
        subject: '重置您的密码',
        html: expect.stringContaining('reset-token-456'),
      });
      expect(result).toEqual({ success: true, id: 'reset-email-id' });
    });

    it('应该在缺少API key时抛出错误', async () => {
      delete process.env.RESEND_API_KEY;

      await expect(
        sendPasswordResetEmail('user@test.com', 'reset-token-456')
      ).rejects.toThrow('RESEND_API_KEY 环境变量未设置');
    });

    it('应该在邮件发送失败时抛出错误', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      mockSend.mockRejectedValue(new Error('API 错误'));

      await expect(
        sendPasswordResetEmail('user@test.com', 'reset-token-456')
      ).rejects.toThrow('密码重置邮件发送失败');
    });
  });
});
