/**
 * Custom Fields API
 * 自定义字段管理
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取自定义字段列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const customFields = await prisma.customField.findMany({
      orderBy: { order: 'asc' },
    });

    return successResponse(customFields);
  } catch (error) {
    console.error('Get custom fields error:', error);
    return errorResponse('获取自定义字段失败', 500);
  }
}

// POST - 创建自定义字段
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { name, key, type, options, required, order } = body;

    if (!name || !key || !type) {
      return errors.badRequest('缺少必填字段');
    }

    const customField = await prisma.customField.create({
      data: {
        name,
        key,
        type,
        options: options ? JSON.stringify(options) : null,
        required: required || false,
        order: order || 0,
        createdBy: session.user.id,
        project: { connect: { id: '' } }, // 临时处理，实际需要传入 projectId
      },
    });

    return successResponse(customField, '创建成功');
  } catch (error) {
    console.error('Create custom field error:', error);
    return errorResponse('创建自定义字段失败', 500);
  }
}
