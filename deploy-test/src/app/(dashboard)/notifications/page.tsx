/**
 * @file 通知中心页面 - Bento风格
 * @description 统一的通知管理页面
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento'
import {
  Check,
  CheckCheck,
  Trash2,
  Bell,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Funnel,
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  read: boolean
  createdAt: string
}

interface NotificationsData {
  notifications: Notification[]
  unreadCount: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// 类型图标映射
const typeIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

// 类型样式映射
const typeStyles = {
  success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  info: 'text-[var(--electric)] bg-[var(--electric)]/10 border-[var(--electric)]/20',
}

export default function NotificationsPage() {
  const { data, error, isLoading, mutate } = useSWR<NotificationsData>(
    '/api/notifications',
    fetcher
  )
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  // 筛选通知
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread' && notification.read) return false
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false
    return true
  })

  // 标记单个已读
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      mutate()
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 标记全部已读
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      mutate()
    } catch (error) {
      console.error('标记全部已读失败:', error)
    }
  }

  // 删除通知
  const deleteNotification = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/notifications/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      mutate()
    } catch (error) {
      console.error('删除通知失败:', error)
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="p-6">
        <BentoCard className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">加载通知失败</h2>
          <p className="text-slate-600">请稍后重试</p>
          <Button onClick={() => mutate()} className="mt-4 bg-[var(--electric)] hover:bg-[var(--electric)]/90">
            重试
          </Button>
        </BentoCard>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BentoHeader
          title="通知中心"
          description="查看和管理所有系统通知"
        />
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            全部已读
          </Button>
        )}
      </div>

      {/* 统计卡片 - Bento风格 */}
      <BentoGrid cols={3}>
        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--electric)]/10 rounded-xl">
              <Bell className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">未读消息</p>
              <p className="text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">系统通知</p>
              <p className="text-2xl font-bold text-slate-900">
                {notifications.filter((n) => n.type === 'info').length}
              </p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">执行完成</p>
              <p className="text-2xl font-bold text-slate-900">
                {notifications.filter((n) => n.type === 'success').length}
              </p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* 筛选和操作栏 */}
      <BentoCard variant="bordered" className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <Funnel className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">筛选:</span>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
            <TabsList className="bg-white border">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="unread">未读</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-white border">
              <TabsTrigger value="all">所有类型</TabsTrigger>
              <TabsTrigger value="success">成功</TabsTrigger>
              <TabsTrigger value="warning">警告</TabsTrigger>
              <TabsTrigger value="error">错误</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </BentoCard>

      {/* 通知列表 */}
      {filteredNotifications.length === 0 ? (
        <BentoCard className="p-12 text-center border-dashed">
          <Bell className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无通知</h3>
          <p className="text-slate-500">
            {filter === 'unread' ? '目前没有未读通知' : '暂时没有新的系统通知'}
          </p>
        </BentoCard>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type]
            return (
              <BentoCard
                key={notification.id}
                variant="bordered"
                className={`p-4 transition-all ${
                  notification.read
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50/50 border-[var(--electric)]/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl ${typeStyles[notification.type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                          {notification.title}
                          {!notification.read && (
                            <Badge className="bg-[var(--electric)] hover:bg-[var(--electric)]">未读</Badge>
                          )}
                        </h3>
                        <p className="text-slate-600 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-slate-400 text-xs mt-2">
                          {new Date(notification.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-[var(--electric)] hover:text-[var(--electric)] hover:bg-[var(--electric)]/10"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            已读
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(notification.id)}
                          data-testid="delete-notification"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </BentoCard>
            )
          })}
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条通知吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={deleteNotification}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
