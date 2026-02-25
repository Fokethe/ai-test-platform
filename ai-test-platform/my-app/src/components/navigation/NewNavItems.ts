/**
 * New Navigation Structure
 * 8 项合并导航
 */

import {
  LayoutDashboard,
  Beaker,
  Play,
  Shield,
  BookOpen,
  Plug,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  subItems?: { id: string; label: string; href: string }[];
}

export const newNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'tests',
    label: '测试中心',
    icon: Beaker,
    href: '/tests',
    subItems: [
      { id: 'cases', label: '用例', href: '/tests?tab=cases' },
      { id: 'suites', label: '套件', href: '/tests?tab=suites' },
      { id: 'ai', label: 'AI生成', href: '/tests?tab=ai' },
    ],
  },
  {
    id: 'runs',
    label: '执行中心',
    icon: Play,
    href: '/runs',
    subItems: [
      { id: 'history', label: '执行历史', href: '/runs' },
      { id: 'scheduled', label: '定时任务', href: '/runs?tab=scheduled' },
    ],
  },
  {
    id: 'quality',
    label: '质量看板',
    icon: Shield,
    href: '/quality',
    subItems: [
      { id: 'issues', label: '问题列表', href: '/quality/issues' },
      { id: 'reports', label: '质量报告', href: '/quality/reports' },
    ],
  },
  {
    id: 'assets',
    label: '资产库',
    icon: BookOpen,
    href: '/assets',
    subItems: [
      { id: 'docs', label: '文档', href: '/assets?type=doc' },
      { id: 'pages', label: '页面', href: '/assets?type=page' },
    ],
  },
  {
    id: 'integrations',
    label: '集成',
    icon: Plug,
    href: '/integrations',
  },
  {
    id: 'inbox',
    label: '通知',
    icon: Bell,
    href: '/inbox',
    badge: 0,
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    href: '/settings',
    subItems: [
      { id: 'profile', label: '个人设置', href: '/settings/profile' },
      { id: 'ai', label: 'AI设置', href: '/settings/ai' },
      { id: 'users', label: '用户管理', href: '/settings/users' },
      { id: 'activity', label: '活动日志', href: '/settings/activity' },
      { id: 'system', label: '系统配置', href: '/settings/system' },
    ],
  },
];

// 旧路由到新路由的映射
export const routeMapping: Record<string, string> = {
  '/testcases': '/tests',
  '/testcases/new': '/tests/new',
  '/test-suites': '/tests?tab=suites',
  '/ai-generate': '/tests?tab=ai',
  '/executions': '/runs',
  '/scheduled-tasks': '/runs?tab=scheduled',
  '/bugs': '/quality/issues',
  '/reports': '/quality/reports',
  '/knowledge': '/assets?type=doc',
  '/pages': '/assets?type=page',
  '/webhooks': '/integrations',
  '/admin/logs': '/settings/activity',
  '/admin/users': '/settings/users',
  '/ai-settings': '/settings/ai',
  '/settings': '/settings/profile',
  '/notifications': '/inbox',
};

// 获取重定向路径
export function getRedirectPath(oldPath: string): string | null {
  if (routeMapping[oldPath]) {
    return routeMapping[oldPath];
  }
  
  const patterns: Record<string, (id: string) => string> = {
    '/testcases/': (id) => `/tests/${id}`,
    '/test-suites/': (id) => `/tests/${id}?type=suite`,
    '/executions/': (id) => `/runs/${id}`,
    '/bugs/': (id) => `/quality/issues/${id}`,
    '/knowledge/': (id) => `/assets/${id}`,
    '/pages/': (id) => `/assets/${id}?type=page`,
    '/webhooks/': (id) => `/integrations/${id}`,
  };
  
  for (const [prefix, builder] of Object.entries(patterns)) {
    if (oldPath.startsWith(prefix)) {
      const id = oldPath.slice(prefix.length).replace(/\/(edit|delete)$/, '');
      const suffix = oldPath.endsWith('/edit') ? '/edit' : '';
      return builder(id) + suffix;
    }
  }
  
  return null;
}
