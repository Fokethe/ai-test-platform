/**
 * GET /api/requirements/:id
 * 获取单个需求详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeParseDbField } from '@/lib/utils/safe-json-parser';
import {
  handleApiError,
  NotFoundError,
  DatabaseConnectionError,
  checkDatabaseConnection,
} from '@/lib/api-error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      throw new DatabaseConnectionError('数据库连接失败，请稍后重试');
    }

    const requirement = await prisma.aiRequirement.findUnique({
      where: { id },
      include: { testPoints: true },
    });

    if (!requirement) {
      throw new NotFoundError('需求');
    }

    // 解析 JSON 字段（安全解析，防止服务器崩溃）
    const result = {
      ...requirement,
      features: safeParseDbField(requirement.features, []),
      businessRules: safeParseDbField(requirement.businessRules, []),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
