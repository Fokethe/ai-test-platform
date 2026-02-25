/**
 * Unified Settings Page
 * 合并个人设置、AI设置、用户管理、日志
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  User,
  Bot,
  Users,
  Activity,
  Settings,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const settingsNav = [
  { id: 'profile', label: '个人设置', icon: User, href: '/settings/profile' },
  { id: 'ai', label: 'AI 设置', icon: Bot, href: '/settings/ai' },
  { id: 'users', label: '用户管理', icon: Users, href: '/settings/users' },
  { id: 'activity', label: '活动日志', icon: Activity, href: '/settings/activity' },
  { id: 'system', label: '系统配置', icon: Settings, href: '/settings/system' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-slate-500">管理个人偏好和系统配置</p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center p-4 border rounded-lg transition-colors',
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-blue-300 hover:bg-slate-50'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg mr-4',
                  isActive ? 'bg-blue-100' : 'bg-slate-100'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    isActive ? 'text-blue-600' : 'text-slate-600'
                  )}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{item.label}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          );
        })}
      </div>

      {/* Redirect Notice */}
      <div className="text-sm text-slate-500 text-center">
        <p>旧版设置页面已合并至此：</p>
        <p className="mt-1">
          <code className="bg-slate-100 px-2 py-1 rounded">/admin/logs</code> →{' '}
          <code className="bg-slate-100 px-2 py-1 rounded">/settings/activity</code>
          <span className="mx-2">|</span>
          <code className="bg-slate-100 px-2 py-1 rounded">/ai-settings</code> →{' '}
          <code className="bg-slate-100 px-2 py-1 rounded">/settings/ai</code>
        </p>
      </div>
    </div>
  );
}
