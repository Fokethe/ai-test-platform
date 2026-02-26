/**
 * GET /api/requirements/:id
 * 获取单个需求详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const requirement = await prisma.aiRequirement.findUnique({
      where: { id },
      include: { testPoints: true },
    });

    if (!requirement) {
      return NextResponse.json(
        { success: false, error: '需求不存在' },
        { status: 404 }
      );
    }

    // 解析 JSON 字段
    const result = {
      ...requirement,
      features: JSON.parse(requirement.features || '[]'),
      businessRules: JSON.parse(requirement.businessRules || '[]'),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get requirement error:', error);
    return NextResponse.json(
      { success: false, error: '获取需求失败' },
      { status: 500 }
    );
  }
}
