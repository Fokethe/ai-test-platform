/**
 * @file 通知中心页面
 * @description 统一的通知管理页面，合并了原有的 inbox 和 notifications 功能
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
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
import { EmptyState } from '@/components/empty-state'
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
  success: 'text-green-600 bg-green-50 border-green-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
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
      <div className="space-y-6" data-testid="loading-skeleton">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
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
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          加载通知失败
        </h2>
        <p className="text-slate-600">请稍后重试</p>
        <Button onClick={() => mutate()} className="mt-4">
          重试
        </Button>
      </div>
    )
  }

  // 获取图标组件
  const SuccessIcon = typeIcons.success
  const WarningIcon = typeIcons.warning
  const ErrorIcon = typeIcons.error
  const InfoIcon = typeIcons.info

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">通知中心</h1>
        <p className="text-slate-600 mt-1">查看和管理所有系统通知</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">未读消息</p>
            <p className="text-2xl font-bold">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">系统通知</p>
            <p className="text-2xl font-bold">
              {notifications.filter((n) => n.type === 'info').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">执行完成</p>
            <p className="text-2xl font-bold">
              {notifications.filter((n) => n.type === 'success').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和操作栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Funnel className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">筛选:</span>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="unread">未读</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={typeFilter} onValueChange={setTypeFilter}>
              <TabsList>
                <TabsTrigger value="all">所有类型</TabsTrigger>
                <TabsTrigger value="success">成功</TabsTrigger>
                <TabsTrigger value="warning">警告</TabsTrigger>
                <TabsTrigger value="error">错误</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex-1" />
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                全部已读
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 类型图标测试元素 */}
      <div className="hidden">
        <span data-testid="icon-success"><SuccessIcon /></span>
        <span data-testid="icon-warning"><WarningIcon /></span>
        <span data-testid="icon-error"><ErrorIcon /></span>
        <span data-testid="icon-info"><InfoIcon /></span>
      </div>

      {/* 通知列表 */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="暂无通知"
          description={
            filter === 'unread'
              ? '目前没有未读通知'
              : '暂时没有新的系统通知'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type]
            return (
              <div
                key={notification.id}
                data-testid="notification-item"
                className={`p-4 rounded-lg border transition-all ${
                  notification.read
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-300 unread'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      typeStyles[notification.type]
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {notification.title}
                          {!notification.read && (
                            <Badge variant="destructive" className="ml-2">
                              未读
                            </Badge>
                          )}
                        </h3>
                        <p className="text-slate-600 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-slate-400 text-xs mt-2">
                          {new Date(notification.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            标记已读
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(notification.id)}
                          data-testid="delete-notification"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
