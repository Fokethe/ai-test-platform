import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response';

// DELETE /api/testcases/[id] - 删除测试用例
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;

    // 检查测试用例是否存在
    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        page: {
          include: {
            system: {
              include: {
                project: {
                  include: {
                    workspace: {
                      include: {
                        members: {
                          where: { userId: session.user.id },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testCase) {
      return NextResponse.json(notFoundResponse('测试用例'), { status: 404 });
    }

    // 检查权限
    if (testCase.page?.system?.project?.workspace?.members?.length === 0) {
      return NextResponse.json(
        errorResponse('您没有权限删除此测试用例', 1003),
        { status: 403 }
      );
    }

    // 删除测试用例（关联的执行记录会通过外键约束自动处理或报错）
    await prisma.testCase.delete({
      where: { id },
    });

    return NextResponse.json(successResponse(null, '删除成功'));
  } catch (error) {
    console.error('Delete test case error:', error);
    return NextResponse.json(
      errorResponse('删除测试用例失败'),
      { status: 500 }
    );
  }
}
