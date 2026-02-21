import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// POST /api/user/avatar - 上传头像
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(errorResponse('请选择要上传的文件'), { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        errorResponse('只支持 JPG、PNG、GIF、WebP 格式的图片'),
        { status: 400 }
      );
    }

    // 验证文件大小 (最大 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse('图片大小不能超过 2MB'),
        { status: 400 }
      );
    }

    // 读取文件并转换为 base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 更新用户头像
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: dataUrl },
      select: {
        id: true,
        image: true,
      },
    });

    return NextResponse.json(successResponse(user, '头像上传成功'));
  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json(errorResponse('上传头像失败'), { status: 500 });
  }
}

// DELETE /api/user/avatar - 删除头像
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
      select: {
        id: true,
        image: true,
      },
    });

    return NextResponse.json(successResponse(user, '头像已删除'));
  } catch (error) {
    console.error('Delete avatar error:', error);
    return NextResponse.json(errorResponse('删除头像失败'), { status: 500 });
  }
}
