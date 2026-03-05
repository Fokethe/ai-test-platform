import { NextRequest, NextResponse } from 'next/server';
import { sendInvitationEmail } from '../../../lib/email/email';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, invitationToken } = body;

    if (!email || !invitationToken) {
      return NextResponse.json(
        { error: '缺少必要的参数：email 或 invitationToken' },
        { status: 400 }
      );
    }

    const result = await sendInvitationEmail(email, invitationToken);

    return NextResponse.json(
      { success: true, message: '邀请邮件已发送', data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('创建用户邀请失败:', error);
    const errorMessage = error instanceof Error ? error.message : '发送邀请失败';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { message: '用户列表API - 待实现' },
    { status: 200 }
  );
}
