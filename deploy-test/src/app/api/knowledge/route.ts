// encoding: utf-8
/**
 * TDD Round 13 - 知识库管理 API
 * GET /api/knowledge - 列表查询（支持分页、搜索）
 * POST /api/knowledge - 创建知识库条目
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 验证 schemas
const createKnowledgeSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().min(1, '项目ID不能为空'),
})

const querySchema = z.object({
  projectId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  authorId: z.string().optional(),
})

/**
 * GET /api/knowledge
 * 获取知识库列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      projectId: searchParams.get('projectId') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      authorId: searchParams.get('authorId') || undefined,
    })

    const page = parseInt(query.page || '1')
    const pageSize = parseInt(query.pageSize || '20')
    const skip = (page - 1) * pageSize

    // 构建查询条件
    const where: any = {}

    if (query.projectId) {
      where.projectId = query.projectId
    }

    if (query.category) {
      where.category = query.category
    }

    if (query.authorId) {
      where.authorId = query.authorId
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    // 检查用户是否有权限访问该项目
    if (query.projectId) {
      const hasAccess = await checkProjectAccess(session.user.id, query.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
      }
    }

    // 查询总数
    const total = await prisma.knowledgeEntry.count({ where })

    // 查询列表
    const items = await prisma.knowledgeEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取知识库列表失败', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: '获取知识库列表失败' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge
 * 创建知识库条目
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const data = createKnowledgeSchema.parse(body)

    // 检查用户是否有权限访问该项目
    const hasAccess = await checkProjectAccess(session.user.id, data.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
    }

    // 创建知识库条目
    const knowledge = await prisma.knowledgeEntry.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        projectId: data.projectId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ data: knowledge }, { status: 201 })
  } catch (error) {
    console.error('创建知识库条目失败', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: '创建知识库条目失败' }, { status: 500 })
  }
}

/**
 * 检查用户是否有项目访问权限
 */
async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
    // 检查是否是项目成员
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
    })

    return !!project
  } catch (error) {
    console.error('检查项目权限失败', error)
    return false
  }
}
