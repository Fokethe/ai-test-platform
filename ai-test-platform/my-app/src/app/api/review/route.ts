/**
 * Review API
 * 审核队列 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { successResponse, errorResponse, errors } from '@/lib/api-response';

// GET /api/review - 获取审核队列列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type');

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submitter: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true },
        },
      },
    });

    return successResponse(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return errorResponse('获取审核列表失败');
  }
}

// POST /api/review - 提交审核
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { title, type, content, referenceId, referenceType } = body;

    if (!title || !type) {
      return errors.badRequest('缺少必要参数');
    }

    const review = await prisma.review.create({
      data: {
        title,
        type,
        content,
        referenceId,
        referenceType,
        submitterId: session.user.id,
        status: 'pending',
      },
    });

    return successResponse(review, 201);
  } catch (error) {
    console.error('Failed to create review:', error);
    return errorResponse('提交审核失败');
  }
}

// PUT /api/review - 审核操作（通过/拒绝）
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const { id, action, comment } = body;

    if (!id || !action) {
      return errors.badRequest('缺少必要参数');
    }

    if (!['approve', 'reject'].includes(action)) {
      return errors.badRequest('无效的操作类型');
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        comment,
      },
    });

    return successResponse(review);
  } catch (error) {
    console.error('Failed to update review:', error);
    return errorResponse('审核操作失败');
  }
}
