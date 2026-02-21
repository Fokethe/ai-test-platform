import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const testCaseSchema = z.object({
  title: z.string().min(1),
  preCondition: z.string().optional(),
  steps: z.array(z.string()),
  expectation: z.string().min(1),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
  tags: z.array(z.string()).optional(),
});

// POST /api/testcases/import
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, testCases, format = 'json' } = body;

    if (!pageId) {
      return NextResponse.json({ error: '页面ID不能为空' }, { status: 400 });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json({ error: '测试用例不能为空' }, { status: 400 });
    }

    // 验证页面存在
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json({ error: '页面不存在' }, { status: 404 });
    }

    // 验证并创建测试用例
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const parseResult = testCaseSchema.safeParse(testCase);

      if (!parseResult.success) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 行: ${parseResult.error.message}`);
        continue;
      }

      try {
        await prisma.testCase.create({
          data: {
            title: parseResult.data.title,
            preCondition: parseResult.data.preCondition,
            steps: JSON.stringify(parseResult.data.steps),
            expectation: parseResult.data.expectation,
            priority: parseResult.data.priority,
            tags: parseResult.data.tags ? JSON.stringify(parseResult.data.tags) : null,
            pageId,
            status: 'ACTIVE',
          },
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 行: 创建失败`);
      }
    }

    return NextResponse.json({
      message: `导入完成: ${results.success} 成功, ${results.failed} 失败`,
      ...results,
    });
  } catch (error) {
    console.error('导入测试用例失败:', error);
    return NextResponse.json({ error: '导入测试用例失败' }, { status: 500 });
  }
}

// GET /api/testcases/import/template
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'template') {
    // 返回 Excel/CSV 模板
    const template = [
      {
        title: '示例测试用例',
        preCondition: '用户已登录',
        steps: '打开页面;点击按钮;输入内容',
        expectation: '操作成功',
        priority: 'P1',
        tags: '冒烟;回归',
      },
    ];

    return NextResponse.json(template);
  }

  return NextResponse.json({ error: '无效请求' }, { status: 400 });
}
