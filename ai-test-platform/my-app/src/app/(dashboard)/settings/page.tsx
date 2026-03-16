/**
 * Settings Page - Bento Grid风格
 * 统一设置中心入口
 */

'use client';

import {
  User,
  Bot,
  Users,
  Activity,
  Settings,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { BentoCard, BentoGrid } from '@/components/bento';
import { BentoHeader } from '@/components/bento';

const settingsNav = [
  {
    id: 'profile',
    label: '个人设置',
    description: '管理个人信息和账户偏好',
    icon: User,
    href: '/settings/profile',
    color: 'bg-blue-500',
  },
  {
    id: 'ai',
    label: 'AI 设置',
    description: '配置AI模型参数和API密钥',
    icon: Bot,
    href: '/settings/ai',
    color: 'bg-purple-500',
  },
  {
    id: 'users',
    label: '用户管理',
    description: '管理系统用户和权限',
    icon: Users,
    href: '/settings/users',
    color: 'bg-green-500',
  },
  {
    id: 'activity',
    label: '活动日志',
    description: '查看系统活动和操作记录',
    icon: Activity,
    href: '/settings/activity',
    color: 'bg-orange-500',
  },
  {
    id: 'system',
    label: '系统配置',
    description: '系统级参数和全局设置',
    icon: Settings,
    href: '/settings/system',
    color: 'bg-[var(--electric)]',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BentoHeader
        title="设置中心"
        description="管理您的账户和系统配置"
      />

      <BentoGrid cols={3}>
        {settingsNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href}>
              <BentoCard
                variant="bordered"
                className="group p-6 cursor-pointer hover:border-[var(--electric)] transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${item.color}/10`}>
                    <Icon className={`h-6 w-6 ${item.color.replace('bg-', 'text-')}`} />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[var(--electric)] group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="mt-4 font-semibold text-lg text-slate-900 group-hover:text-[var(--electric)] transition-colors">
                  {item.label}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {item.description}
                </p>
              </BentoCard>
            </Link>
          );
        })}
      </BentoGrid>

      {/* 快捷操作 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
        <BentoGrid cols={2}>
          <BentoCard className="p-6 border-dashed">
            <h3 className="font-medium text-slate-700">需要帮助？</h3>
            <p className="text-sm text-slate-500 mt-1">
              查看使用文档或联系管理员获取支持
            </p>
          </BentoCard>
          <BentoCard className="p-6 border-dashed">
            <h3 className="font-medium text-slate-700">系统状态</h3>
            <p className="text-sm text-slate-500 mt-1">
              所有系统运行正常
            </p>
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
}
