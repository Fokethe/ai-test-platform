'use client';

import Link from 'next/link';
import { Activity, Bot, ChevronRight, Settings, ShieldCheck, User, Users } from 'lucide-react';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import { useSystemLanguage } from '@/components/system-language-provider';

export default function SettingsPage() {
  const { t } = useSystemLanguage();

  const settingsNav = [
    {
      id: 'profile',
      label: t('\u4e2a\u4eba\u8bbe\u7f6e', 'Profile'),
      description: t('\u7ba1\u7406\u4f60\u7684\u4e2a\u4eba\u8d26\u53f7\u504f\u597d\u3002', 'Manage your personal account preferences.'),
      icon: User,
      href: '/settings/profile',
      color: 'bg-blue-500',
    },
    {
      id: 'ai',
      label: t('AI \u8bbe\u7f6e', 'AI Settings'),
      description: t('\u5728\u4e00\u4e2a\u9875\u9762\u5185\u7edf\u4e00\u7ba1\u7406\u6a21\u578b\u3001\u5bc6\u94a5\u548c AI \u53ef\u89c2\u6d4b\u3002', 'Manage models, keys, and AI observability in one place.'),
      icon: Bot,
      href: '/settings/ai',
      color: 'bg-purple-500',
    },
    {
      id: 'users',
      label: t('\u7528\u6237\u7ba1\u7406', 'User Management'),
      description: t('\u7ba1\u7406\u7528\u6237\u72b6\u6001\u3001\u89d2\u8272\u4e0e\u8d26\u53f7\u5b89\u5168\u3002', 'Manage user status, roles, and account safety.'),
      icon: Users,
      href: '/settings/users',
      color: 'bg-green-500',
    },
    {
      id: 'roles',
      label: t('\u89d2\u8272\u4e0e\u83dc\u5355', 'Role & Menu'),
      description: t('\u914d\u7f6e\u4e0d\u540c\u89d2\u8272\u7684\u83dc\u5355\u53ef\u89c1\u6027\u4e0e\u7ba1\u7406\u6743\u9650\u3002', 'Control role-based menu visibility and admin access.'),
      icon: ShieldCheck,
      href: '/settings/roles',
      color: 'bg-indigo-500',
    },
    {
      id: 'activity',
      label: t('\u6d3b\u52a8\u65e5\u5fd7', 'Activity Logs'),
      description: t('\u67e5\u770b\u5173\u952e\u64cd\u4f5c\u548c\u6cbb\u7406\u5ba1\u8ba1\u8f68\u8ff9\u3002', 'Inspect key operations and governance traces.'),
      icon: Activity,
      href: '/settings/activity',
      color: 'bg-orange-500',
    },
    {
      id: 'system',
      label: t('\u7cfb\u7edf\u914d\u7f6e', 'System'),
      description: t('\u7ba1\u7406\u5e73\u53f0\u7ea7\u5168\u5c40\u53c2\u6570\u4e0e\u914d\u7f6e\u3002', 'Manage global platform-level settings.'),
      icon: Settings,
      href: '/settings/system',
      color: 'bg-[var(--electric)]',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BentoHeader
        title={t('\u8bbe\u7f6e\u4e2d\u5fc3', 'Settings')}
        description={t('\u7edf\u4e00\u7ba1\u7406\u8d26\u53f7\u3001\u5b89\u5168\u4e0e\u6cbb\u7406\u914d\u7f6e\u3002', 'Centralized account, security, and governance configuration.')}
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
                <p className="mt-1 text-sm text-slate-500">{item.description}</p>
              </BentoCard>
            </Link>
          );
        })}
      </BentoGrid>
    </div>
  );
}
