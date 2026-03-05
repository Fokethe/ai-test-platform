import { Resend } from 'resend';

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY 环境变量未设置');
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.FROM_EMAIL || 'noreply@ai-test-platform.com';
}

function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export function generateInvitationEmailTemplate(invitationUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">邀请您加入AI测试平台</h2>
      <p>您好！</p>
      <p>您被邀请加入AI测试平台。请点击以下链接接受邀请：</p>
      <div style="margin: 20px 0;">
        <a href="${invitationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          接受邀请
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
        <a href="${invitationUrl}">${invitationUrl}</a>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        此邀请将在24小时后过期。如果您没有收到邀请，请忽略此邮件。
      </p>
    </div>
  `;
}

export function generatePasswordResetEmailTemplate(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">重置您的密码</h2>
      <p>您好！</p>
      <p>我们收到了您重置密码的请求。请点击以下链接重置密码：</p>
      <div style="margin: 20px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          重置密码
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。
      </p>
    </div>
  `;
}

function handleEmailResponse(result: { id?: string; error?: { message: string } | null }): EmailResult {
  if (result.error) {
    throw new Error(result.error.message || '邮件发送失败');
  }
  return {
    success: true,
    id: result.id,
  };
}

export async function sendInvitationEmail(
  to: string,
  invitationToken: string
): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const from = getFromEmail();
    const appUrl = getAppUrl();
    
    const invitationUrl = `${appUrl}/accept-invitation?token=${invitationToken}`;
    const html = generateInvitationEmailTemplate(invitationUrl);
    
    const result = await resend.emails.send({
      from,
      to,
      subject: '邀请您加入AI测试平台',
      html,
    });
    
    return handleEmailResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'RESEND_API_KEY 环境变量未设置') {
      throw error;
    }
    console.error('发送邀请邮件失败:', error);
    throw new Error('邀请邮件发送失败');
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const from = getFromEmail();
    const appUrl = getAppUrl();
    
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    const html = generatePasswordResetEmailTemplate(resetUrl);
    
    const result = await resend.emails.send({
      from,
      to,
      subject: '重置您的密码',
      html,
    });
    
    return handleEmailResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'RESEND_API_KEY 环境变量未设置') {
      throw error;
    }
    console.error('发送密码重置邮件失败:', error);
    throw new Error('密码重置邮件发送失败');
  }
}
