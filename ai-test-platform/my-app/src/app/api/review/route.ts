/**
 * Review API
 * 审核队列 API 路由
 * FIXME: Review 模型未在 Prisma schema 中定义，暂时禁用
 */

import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api-response';

// GET /api/review - 获取审核队列列表
export async function GET(request: NextRequest) {
  return errorResponse('Review 功能暂未实现 - 缺少数据库模型', 501);
}

// POST /api/review - 提交审核
export async function POST(request: NextRequest) {
  return errorResponse('Review 功能暂未实现 - 缺少数据库模型', 501);
}

// PUT /api/review - 审核操作（通过/拒绝）
export async function PUT(request: NextRequest) {
  return errorResponse('Review 功能暂未实现 - 缺少数据库模型', 501);
}
