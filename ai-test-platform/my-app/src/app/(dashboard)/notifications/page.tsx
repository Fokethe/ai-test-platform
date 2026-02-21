'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Filter,
  AlertCircle,
  Play,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'SYSTEM' | 'EXECUTION' | 'INVITE';
  read: boolean;
  createdAt: string;
  data?: string;
}

const typeConfig = {
  SYSTEM: {
    label: '系统通知',
    icon: AlertCircle,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  EXECUTION: {
    label: '执行完成',
    icon: Play,
    color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  INVITE: {
    label: '协作邀请',
    icon: Users,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 获取消息列表
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(readFilter !== 'all' && { read: readFilter }),
      });

      const res = await fetch(`/api/notifications?${params}`);
      const result = await res.json();

      if (result.code === 0) {
        setNotifications(result.data.notifications);
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages,
        }));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('获取消息列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, typeFilter, readFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 标记单条已读
  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        toast.success('已标记为已读');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 标记全部已读
  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications?action=mark-all-read', {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('全部标记为已读');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 删除单条消息
  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('消息已删除');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // 清空所有消息
  const clearAll = async () => {
    try {
      const res = await fetch('/api/notifications?action=clear-all', {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications([]);
        toast.success('消息已清空');
        setShowClearDialog(false);
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return date.toLocaleString('zh-CN');
  };

  // 统计各类型消息数量
  const stats = {
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    system: notifications.filter(n => n.type === 'SYSTEM').length,
    execution: notifications.filter(n => n.type === 'EXECUTION').length,
    invite: notifications.filter(n => n.type === 'INVITE').length,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              消息中心
            </h1>
            <p className="text-slate-600 mt-1">查看和管理您的消息通知</p>
          </div>
          <div className="flex gap-2">
            {stats.unread > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                全部已读
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" onClick={() => setShowClearDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                清空消息
              </Button>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">全部消息</p>
              <p className="text-2xl font-bold">{stats.all}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">未读消息</p>
              <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">系统通知</p>
              <p className="text-2xl font-bold">{stats.system}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">执行完成</p>
              <p className="text-2xl font-bold">{stats.execution}</p>
            </CardContent>
          </Card>
        </div>

        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">筛选：</span>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="SYSTEM">系统通知</SelectItem>
                  <SelectItem value="EXECUTION">执行完成</SelectItem>
                  <SelectItem value="INVITE">协作邀请</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="false">未读</SelectItem>
                  <SelectItem value="true">已读</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 消息列表 */}
        <Card>
          <CardHeader>
            <CardTitle>消息列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton count={5} />
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-2">暂无消息</p>
                <p className="text-sm text-slate-400">当有新消息时会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const TypeIcon = config.icon;
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 rounded-lg border transition-all',
                        notification.read
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* 类型图标 */}
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0',
                            config.color
                          )}
                        >
                          <TypeIcon className="h-5 w-5" />
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{notification.title}</h3>
                              {!notification.read && (
                                <Badge variant="default" className="bg-blue-500">
                                  未读
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {notification.content}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant="secondary" className={cn('text-xs', config.color)}>
                              {config.label}
                            </Badge>
                            <div className="flex gap-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  已读
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                disabled={deletingId === notification.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingId === notification.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                删除
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {!loading && notifications.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-slate-600">
                  共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 清空确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空所有消息</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除所有消息，包括未读消息。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              className="bg-red-600 hover:bg-red-700"
            >
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
