import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { LogType, LogLevel } from '@prisma/client'

// GET /api/logs/export - 导出日志
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查权限
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, csv
    const type = searchParams.get('type') as LogType | null
    const level = searchParams.get('level') as LogLevel | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建查询条件
    const where: any = {}
    if (type) where.type = type
    if (level) where.level = level
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // 查询所有符合条件的日志（导出不分页）
    const logs = await prisma.log.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (format === 'csv') {
      // 生成 CSV
      const headers = ['时间', '类型', '级别', '用户', '操作', '对象', '消息', 'IP']
      const rows = logs.map(log => [
        log.createdAt.toISOString(),
        log.type,
        log.level,
        log.user?.name || log.user?.email || '系统',
        log.action,
        log.target,
        log.message,
        log.ip || '-'
      ])
      
      const csv = [headers.join(','), ...rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // 默认 JSON 格式
    return NextResponse.json({ data: logs })
  } catch (error) {
    console.error('Failed to export logs:', error)
    return NextResponse.json(
      { error: 'Failed to export logs' },
      { status: 500 }
    )
  }
}
