import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { LogType, LogLevel } from '@prisma/client'

// GET /api/logs - 查询日志列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查权限（仅 ADMIN 可查看所有日志）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as LogType | null
    const level = searchParams.get('level') as LogLevel | null
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // 构建查询条件
    const where: any = {}
    if (type) where.type = type
    if (level) where.level = level
    if (userId) where.userId = userId
    if (action) where.action = { contains: action }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // 查询总数
    const total = await prisma.log.count({ where })

    // 查询日志列表
    const logs = await prisma.log.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error('Failed to fetch logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

// POST /api/logs - 创建日志（内部使用）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { type, level, action, target, message, details, ip, userAgent } = body

    const log = await prisma.log.create({
      data: {
        type: type || 'SYSTEM',
        level: level || 'INFO',
        userId: session?.user?.id,
        action,
        target,
        message,
        details: details ? JSON.stringify(details) : null,
        ip,
        userAgent
      }
    })

    return NextResponse.json({ data: log }, { status: 201 })
  } catch (error) {
    console.error('Failed to create log:', error)
    return NextResponse.json(
      { error: 'Failed to create log' },
      { status: 500 }
    )
  }
}
