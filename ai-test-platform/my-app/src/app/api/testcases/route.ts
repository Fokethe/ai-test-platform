import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

// GET /api/testcases - 获取测试用例列表
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[API /api/testcases] Unauthorized - no session');
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);
    const keyword = searchParams.get('keyword') || '';

    console.log(`[API /api/testcases] Request params:`, { pageId, projectId, page, pageSize, keyword });

    // 如果提供了 projectId，获取该项目下的所有用例
    if (projectId) {
      console.log(`[API /api/testcases] Querying testcases by projectId: ${projectId}`);
      
      // 首先检查该 project 下是否有 system
      const systems = await prisma.system.findMany({
        where: { projectId },
        select: { id: true, name: true },
      });
      console.log(`[API /api/testcases] Found ${systems.length} systems for project ${projectId}:`, systems.map(s => s.name));

      // 检查这些 system 下是否有 page
      const systemIds = systems.map(s => s.id);
      const pages = systemIds.length > 0 ? await prisma.page.findMany({
        where: { systemId: { in: systemIds } },
        select: { id: true, name: true, systemId: true },
      }) : [];
      console.log(`[API /api/testcases] Found ${pages.length} pages:`, pages.map(p => p.name));

      const testCases = await prisma.testCase.findMany({
        where: {
          page: {
            system: {
              projectId: projectId,
            },
          },
          ...(keyword && { title: { contains: keyword } }),
        },
        select: {
          id: true,
          title: true,
          priority: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          page: {
            select: {
              id: true,
              name: true,
              system: {
                select: { 
                  id: true,
                  name: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`[API /api/testcases] Found ${testCases.length} testcases for project ${projectId}`);
      if (testCases.length > 0) {
        console.log(`[API /api/testcases] Sample testcase:`, JSON.stringify(testCases[0], null, 2));
      }

      const response = successResponse({ list: testCases });
      console.log(`[API /api/testcases] Response:`, JSON.stringify(response, null, 2));
      
      return NextResponse.json(response);
    }

    // 普通的 pageId 查询
    console.log(`[API /api/testcases] Querying testcases by pageId: ${pageId}`);
    const where = {
      ...(pageId && { pageId }),
      ...(keyword && { title: { contains: keyword } }),
    };

    const [testCases, total] = await Promise.all([
      prisma.testCase.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          priority: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          page: {
            select: {
              id: true,
              name: true,
              system: {
                select: { 
                  id: true,
                  name: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          requirement: {
            select: { 
              id: true,
              title: true 
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.testCase.count({ where }),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[API Timing] GET /api/testcases: ${duration}ms (items: ${testCases.length}, total: ${total})`);

    return NextResponse.json(
      successResponse({
        list: testCases,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }),
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=10',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] GET /api/testcases failed: ${duration}ms`, error);
    return NextResponse.json(
      errorResponse('获取测试用例失败'),
      { status: 500 }
    );
  }
}

// POST /api/testcases - 创建测试用例
const createSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  preCondition: z.string().optional(),
  steps: z.array(z.string()),
  expectation: z.string().min(1, '预期结果不能为空'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
  tags: z.array(z.string()).optional(),
  pageId: z.string(),
  requirementId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.issues[0].message, 1002),
        { status: 400 }
      );
    }

    const { steps, tags, ...data } = result.data;

    const testCase = await prisma.testCase.create({
      data: {
        ...data,
        steps: JSON.stringify(steps),
        tags: tags ? JSON.stringify(tags) : null,
      },
      select: {
        id: true,
        title: true,
        preCondition: true,
        steps: true,
        expectation: true,
        priority: true,
        tags: true,
        pageId: true,
        requirementId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[API Timing] POST /api/testcases: ${duration}ms (testCaseId: ${testCase.id})`);

    return NextResponse.json(successResponse(testCase, '创建成功'));
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Timing] POST /api/testcases failed: ${duration}ms`, error);
    return NextResponse.json(
      errorResponse('创建测试用例失败'),
      { status: 500 }
    );
  }
}
