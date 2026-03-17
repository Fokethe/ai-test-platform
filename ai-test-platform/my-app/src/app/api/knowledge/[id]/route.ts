// encoding: utf-8
/**
 * TDD Round 13 - 知识库单条 API
 * GET /api/knowledge/[id] - 详情查询
 * PUT /api/knowledge/[id] - 更新
 * DELETE /api/knowledge/[id] - 删除
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 验证 schemas
const updateKnowledgeSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  content: z.string().min(1, '内容不能为空').optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * GET /api/knowledge/[id]
 * 获取知识库条目详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { id } = await params

    // 查询知识库条目
    const knowledge = await prisma.knowledgeEntry.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 手动查询项目信息
    let project = null
    if (knowledge?.projectId) {
      project = await prisma.project.findUnique({
        where: { id: knowledge.projectId },
        select: { id: true, name: true },
      })
    }

    if (!knowledge) {
      return NextResponse.json({ error: '知识库条目不存在' }, { status: 404 })
    }

    // 检查用户是否有权限访问该项目（如果有关联项目）
    if (knowledge.projectId) {
      const hasAccess = await checkProjectAccess(session.user.id, knowledge.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
      }
    }

    // 合并项目信息到返回数据
    const result = {
      ...knowledge,
      project,
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('获取知识库详情失败:', error)
    return NextResponse.json({ error: '获取知识库详情失败' }, { status: 500 })
  }
}

/**
 * PUT /api/knowledge/[id]
 * 更新知识库条目
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { id } = await params

    // 检查知识库条目是否存在
    const existing = await prisma.knowledgeEntry.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: '知识库条目不存在' }, { status: 404 })
    }

    // 检查用户是否有权限访问该项目（如果有关联项目）
    if (existing.projectId) {
      const hasAccess = await checkProjectAccess(session.user.id, existing.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
      }
    }

    const body = await request.json()
    const data = updateKnowledgeSchema.parse(body)

    // 更新知识库条目
    const knowledge = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.tags && { tags: JSON.stringify(data.tags) }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 手动查询项目信息
    let project = null
    if (knowledge?.projectId) {
      project = await prisma.project.findUnique({
        where: { id: knowledge.projectId },
        select: { id: true, name: true },
      })
    }

    // 合并项目信息到返回数据
    const result = {
      ...knowledge,
      project,
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('更新知识库条目失败:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: '更新知识库条目失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge/[id]
 * 删除知识库条目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { id } = await params

    // 检查知识库条目是否存在
    const existing = await prisma.knowledgeEntry.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: '知识库条目不存在' }, { status: 404 })
    }

    // 检查用户是否有权限访问该项目（如果有关联项目）
    if (existing.projectId) {
      const hasAccess = await checkProjectAccess(session.user.id, existing.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
      }
    }

    // 删除知识库条目
    await prisma.knowledgeEntry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除知识库条目失败:', error)
    return NextResponse.json({ error: '删除知识库条目失败' }, { status: 500 })
  }
}

/**
 * 检查用户是否有项目访问权限
 */
async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
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
    console.error('检查项目权限失败:', error)
    return false
  }
}
