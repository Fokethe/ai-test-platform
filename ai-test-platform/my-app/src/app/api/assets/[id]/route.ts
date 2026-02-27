/**
 * Asset Detail API
 * GET /api/assets/[id] - 获取资产详情
 * PUT /api/assets/[id] - 更新资产
 * DELETE /api/assets/[id] - 删除资产
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse, errors } from '@/lib/api-response';
import { auth } from '@/lib/auth';

// GET - 获取资产详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    if (!asset) {
      return errors.notFound('资产');
    }

    // 解析 tags
    let tags = [];
    if (asset.tags) {
      try {
        tags = JSON.parse(asset.tags);
      } catch {
        tags = [];
      }
    }

    // 如果是页面类型，解析内容中的选择器配置
    let selectors = [];
    if (asset.type === 'PAGE' && asset.content) {
      try {
        const content = JSON.parse(asset.content);
        selectors = content.selectors || [];
      } catch {
        selectors = [];
      }
    }

    return Response.json(successResponse({
      ...asset,
      tags,
      selectors
    }));
  } catch (error) {
    console.error('Get asset error:', error);
    return errorResponse('获取资产详情失败', 500);
  }
}

// PUT - 更新资产
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errors.badRequest('无效的 JSON 请求体');
    }
    const { title, description, content, url, selector, tags, status } = body;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('资产');
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        title,
        description,
        content,
        url,
        selector,
        status,
        tags: tags ? JSON.stringify(tags) : undefined
      }
    });

    return successResponse(updated, '更新成功');
  } catch (error) {
    console.error('Update asset error:', error);
    return errorResponse('更新失败', 500);
  }
}

// DELETE - 删除资产
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('资产');
    }

    // 软删除
    await prisma.asset.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });

    return successResponse(null, '已删除');
  } catch (error) {
    console.error('Delete asset error:', error);
    return errorResponse('删除失败', 500);
  }
}
