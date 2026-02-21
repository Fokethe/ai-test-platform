import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  testCaseIds: z.array(z.string()).optional(),
});

// GET /api/test-suites/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await params;

    const suite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        testSuiteCases: {
          include: {
            testCase: true,
          },
          orderBy: { order: 'asc' },
        },
        project: true,
      },
    });

    if (!suite) {
      return NextResponse.json({ error: '测试套件不存在' }, { status: 404 });
    }

    return NextResponse.json(suite);
  } catch (error) {
    console.error('获取测试套件详情失败:', error);
    return NextResponse.json({ error: '获取测试套件详情失败' }, { status: 500 });
  }
}

// PATCH /api/test-suites/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '参数错误', details: result.error.format() },
        { status: 400 }
      );
    }

    const { testCaseIds, ...data } = result.data;

    // 如果需要更新关联的用例
    if (testCaseIds !== undefined) {
      const { id } = await params;

      // 删除旧的关联
      await prisma.testSuiteCase.deleteMany({
        where: { testSuiteId: id },
      });

      // 创建新的关联
      if (testCaseIds.length > 0) {
        await prisma.testSuiteCase.createMany({
          data: testCaseIds.map((testCaseId, index) => ({
            testSuiteId: id,
            testCaseId,
            order: index,
          })),
        });
      }
    }

    const { id } = await params;

    // 更新套件信息
    const suite = await prisma.testSuite.update({
      where: { id },
      data,
      include: {
        testSuiteCases: {
          include: { testCase: true },
        },
      },
    });

    return NextResponse.json(suite);
  } catch (error) {
    console.error('更新测试套件失败:', error);
    return NextResponse.json({ error: '更新测试套件失败' }, { status: 500 });
  }
}

// DELETE /api/test-suites/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.testSuite.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除测试套件失败:', error);
    return NextResponse.json({ error: '删除测试套件失败' }, { status: 500 });
  }
}
