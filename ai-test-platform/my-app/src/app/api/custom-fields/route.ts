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

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');

    const where: any = {};
    if (entityType) {
      where.entityType = entityType;
    }

    const customFields = await prisma.customField.findMany({
      where,
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
    const { name, key, type, entityType, options, required, order } = body;

    if (!name || !key || !type || !entityType) {
      return errors.badRequest('缺少必填字段');
    }

    const customField = await prisma.customField.create({
      data: {
        name,
        key,
        type,
        entityType,
        options: options ? JSON.stringify(options) : null,
        required: required || false,
        order: order || 0,
      },
    });

    return successResponse(customField, '创建成功');
  } catch (error) {
    console.error('Create custom field error:', error);
    return errorResponse('创建自定义字段失败', 500);
  }
}
