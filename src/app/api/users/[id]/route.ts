import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '../../../../lib/email/email';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();
    const { resetToken, email } = body;

    if (!resetToken || !email) {
      return NextResponse.json(
        { error: '缺少必要的参数：resetToken 或 email' },
        { status: 400 }
      );
    }

    const result = await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json(
      { success: true, message: '密码重置邮件已发送', data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('发送密码重置邮件失败:', error);
    const errorMessage = error instanceof Error ? error.message : '发送密码重置邮件失败';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = params;
  return NextResponse.json(
    { message: '用户详情API', userId: id },
    { status: 200 }
  );
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = params;
  return NextResponse.json(
    { message: '更新用户API', userId: id },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = params;
  return NextResponse.json(
    { message: '删除用户API', userId: id },
    { status: 200 }
  );
}
