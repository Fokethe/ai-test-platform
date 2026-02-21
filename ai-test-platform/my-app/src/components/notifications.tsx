'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, Loader2, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'SYSTEM' | 'EXECUTION' | 'INVITE';
  read: boolean;
  createdAt: string;
  data?: string;
}

const typeIcons = {
  SYSTEM: '🔔',
  EXECUTION: '▶️',
  INVITE: '👥',
};

const typeLabels = {
  SYSTEM: '系统通知',
  EXECUTION: '执行完成',
  INVITE: '协作邀请',
};

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // 获取未读消息
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread');
      if (res.ok) {
        const result = await res.json();
        if (result.code === 0) {
          setUnreadCount(result.data.unreadCount);
          setNotifications(result.data.recentNotifications);
        }
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
    }
  }, []);

  // 轮询获取未读消息
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30秒轮询一次
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // 标记单条已读
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 标记全部已读
  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?action=mark-all-read', {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success('全部标记为已读');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空消息
  const clearAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?action=clear-all', {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('消息已清空');
        setShowClearDialog(false);
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除单条消息
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const deleted = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (deleted && !deleted.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      toast.error('删除失败');
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
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="消息通知"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">消息通知</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={markAllAsRead}
                  disabled={loading}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  全部已读
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowClearDialog(true)}
                disabled={loading || notifications.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">暂无新消息</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                      !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      router.push('/notifications');
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">
                        {typeIcons[notification.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-slate-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {typeLabels[notification.type]}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => markAsRead(notification.id, e)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => deleteNotification(notification.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />
          <div className="p-2">
            <Link href="/notifications">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => setOpen(false)}
              >
                查看全部消息
              </Button>
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空消息</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除所有消息，包括未读消息。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
