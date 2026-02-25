/**
 * Inbox Page - 通知中心
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InboxItem {
  id: string;
  type: 'SYSTEM' | 'ALERT' | 'SUCCESS' | 'MENTION';
  title: string;
  content: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 30000,
  });

  const items: InboxItem[] = data?.data || [];
  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !item.isRead;
    return item.type.toLowerCase() === activeTab;
  });

  const unreadCount = items.filter((i) => !i.isRead).length;

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    mutate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">通知</h1>
          <p className="text-slate-500">
            {unreadCount > 0 ? `你有 ${unreadCount} 条未读通知` : '暂无新通知'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            全部已读
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            全部
            {items.length > 0 && <Badge variant="secondary" className="ml-2">{items.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="unread">
            未读
            {unreadCount > 0 && <Badge className="ml-2 bg-red-100 text-red-700">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="system">系统</TabsTrigger>
          <TabsTrigger value="alert">告警</TabsTrigger>
          <TabsTrigger value="success">成功</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <NotificationList items={filteredItems} isLoading={isLoading} onRefresh={() => mutate()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({ items, isLoading, onRefresh }: { items: InboxItem[]; isLoading: boolean; onRefresh: () => void }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <NotificationCard key={item.id} item={item} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function NotificationCard({ item, onRefresh }: { item: InboxItem; onRefresh: () => void }) {
  const { icon: Icon, color } = getNotificationConfig(item.type);

  const markAsRead = async () => {
    await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
    onRefresh();
  };

  const deleteItem = async () => {
    await fetch(`/api/notifications/${item.id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className={cn('flex items-start gap-4 p-4 border rounded-lg', !item.isRead && 'bg-blue-50/50')}>
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn('font-medium', !item.isRead && 'text-blue-900')}>{item.title}</h3>
        <p className="text-sm text-slate-500 mt-1">{item.content}</p>
        {item.linkUrl && (
          <Link href={item.linkUrl} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            查看详情
          </Link>
        )}
        <p className="text-xs text-slate-400 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex gap-1">
        {!item.isRead && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={markAsRead}>
            <Check className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={deleteItem}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function getNotificationConfig(type: string) {
  const configs: Record<string, { icon: any; color: string }> = {
    SYSTEM: { icon: Info, color: 'bg-blue-100 text-blue-600' },
    ALERT: { icon: AlertCircle, color: 'bg-red-100 text-red-600' },
    SUCCESS: { icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    MENTION: { icon: MessageSquare, color: 'bg-purple-100 text-purple-600' },
  };
  return configs[type] || configs.SYSTEM;
}
