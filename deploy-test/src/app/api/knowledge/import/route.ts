// encoding: utf-8
/**
 * TDD Round 13 - 知识库批量导入 API
 * POST /api/knowledge/import - 批量导入知识库条目
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 单条知识库条目验证 schema
const knowledgeItemSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// 批量导入请求验证 schema
const importSchema = z.object({
  projectId: z.string().min(1, '项目ID不能为空'),
  items: z.array(knowledgeItemSchema).min(1, '至少需要一个条目'),
})

// 导入结果类型
interface ImportResult {
  success: boolean
  index: number
  title: string
  id?: string
  error?: string
}

/**
 * POST /api/knowledge/import
 * 批量导入知识库条目
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const data = importSchema.parse(body)

    // 检查用户是否有权限访问该项目
    const hasAccess = await checkProjectAccess(session.user.id, data.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: '无权限访问该项目' }, { status: 403 })
    }

    // 批量导入
    const results: ImportResult[] = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]

      try {
        // 检查是否已存在相同标题的条目
        const existing = await prisma.knowledgeEntry.findFirst({
          where: {
            projectId: data.projectId,
            title: item.title,
          },
        })

        let knowledge
        if (existing) {
          // 更新已存在的条目
          knowledge = await prisma.knowledgeEntry.update({
            where: { id: existing.id },
            data: {
              content: item.content,
              category: item.category,
              tags: item.tags || [],
            },
          })
        } else {
          // 创建新条目
          knowledge = await prisma.knowledgeEntry.create({
            data: {
              title: item.title,
              content: item.content,
              category: item.category,
              tags: item.tags || [],
              projectId: data.projectId,
              authorId: session.user.id,
            },
          })
        }

        results.push({
          success: true,
          index: i,
          title: item.title,
          id: knowledge.id,
        })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        results.push({
          success: false,
          index: i,
          title: item.title,
          error: errorMessage,
        })
        failCount++
      }
    }

    return NextResponse.json({
      data: {
        total: data.items.length,
        success: successCount,
        fail: failCount,
        results,
      },
    })
  } catch (error) {
    console.error('批量导入知识库失败', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: '批量导入知识库失败' }, { status: 500 })
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
    console.error('检查项目权限失败', error)
    return false
  }
}
