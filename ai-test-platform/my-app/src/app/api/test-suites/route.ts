import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  description: z.string().optional(),
  projectId: z.string().min(1, '项目ID不能为空'),
  testCaseIds: z.array(z.string()).optional(),
});

// GET /api/test-suites?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(errorResponse('项目ID不能为空', 1002), { status: 400 });
    }

    const suites = await prisma.testSuite.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { testSuiteCases: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(successResponse({ list: suites }));
  } catch (error) {
    console.error('获取测试套件失败:', error);
    return NextResponse.json(errorResponse('获取测试套件失败'), { status: 500 });
  }
}

// POST /api/test-suites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('参数错误: ' + result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { name, description, projectId, testCaseIds = [] } = result.data;

    // 创建测试套件并关联用例
    const suite = await prisma.testSuite.create({
      data: {
        name,
        description,
        projectId,
        testSuiteCases: {
          create: testCaseIds.map((id, index) => ({
            testCaseId: id,
            order: index,
          })),
        },
      },
      include: {
        testSuiteCases: true,
      },
    });

    return NextResponse.json(successResponse(suite, '创建成功'));
  } catch (error) {
    console.error('创建测试套件失败:', error);
    return NextResponse.json(errorResponse('创建测试套件失败'), { status: 500 });
  }
}
