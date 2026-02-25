'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Beaker,
  Play,
  Shield,
  BookOpen,
  Plug,
  Bell,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  FolderKanban,
  Layers,
  Clock,
  Bug,
  FileText,
  Brain,
  Activity,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ==================== 新导航结构 (8项合并) ====================

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  subItems?: { id: string; label: string; href: string; icon?: LucideIcon }[];
}

const mainNavItems: NavItem[] = [
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
      { id: 'cases', label: '用例库', href: '/tests?tab=cases', icon: FolderKanban },
      { id: 'suites', label: '测试套件', href: '/tests?tab=suites', icon: Layers },
      { id: 'ai', label: 'AI生成', href: '/tests?tab=ai', icon: Brain },
    ],
  },
  {
    id: 'runs',
    label: '执行中心',
    icon: Play,
    href: '/runs',
    subItems: [
      { id: 'history', label: '执行历史', href: '/runs', icon: Clock },
      { id: 'scheduled', label: '定时任务', href: '/runs?tab=scheduled', icon: Clock },
    ],
  },
  {
    id: 'quality',
    label: '质量看板',
    icon: Shield,
    href: '/quality',
    subItems: [
      { id: 'issues', label: '问题列表', href: '/quality/issues', icon: Bug },
      { id: 'reports', label: '质量报告', href: '/quality/reports', icon: FileText },
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
    badge: 0, // TODO: 从 API 获取
  },
];

// 设置菜单（合并所有设置项）
const settingsNav: NavItem = {
  id: 'settings',
  label: '设置',
  icon: Settings,
  href: '/settings',
  subItems: [
    { id: 'profile', label: '个人设置', href: '/settings/profile', icon: User },
    { id: 'ai', label: 'AI设置', href: '/settings/ai', icon: Brain },
    { id: 'users', label: '用户管理', href: '/settings/users', icon: Users },
    { id: 'activity', label: '活动日志', href: '/settings/activity', icon: Activity },
    { id: 'system', label: '系统配置', href: '/settings/system', icon: Settings },
  ],
};

// 主题配置
const themes = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '自动', icon: Monitor },
];

// ==================== 组件 ====================

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function NavItemComponent({ item, isActive, collapsed, expanded, onToggle }: NavItemProps) {
  const Icon = item.icon;
  const hasSubItems = item.subItems && item.subItems.length > 0;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center justify-center p-3 rounded-lg transition-colors',
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        )}
        title={item.label}
      >
        <Icon size={20} />
        {item.badge ? (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        ) : null}
      </Link>
    );
  }

  return (
    <div>
      <Link
        href={item.href}
        onClick={hasSubItems ? onToggle : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        )}
      >
        <Icon size={18} />
        <span className="flex-1 text-sm font-medium">{item.label}</span>
        {item.badge ? (
          <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
            {item.badge}
          </span>
        ) : null}
        {hasSubItems ? (
          <ChevronDown
            size={14}
            className={cn(
              'text-slate-400 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        ) : null}
      </Link>
      
      {/* 子菜单 */}
      {hasSubItems && expanded && (
        <div className="mt-1 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 space-y-1">
          {item.subItems?.map((sub) => (
            <Link
              key={sub.id}
              href={sub.href}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {sub.icon && <sub.icon size={14} />}
              <span>{sub.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 布局组件 ====================

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isItemActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.subItems?.some((sub) => pathname.startsWith(sub.href.split('?')[0]))) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 移动端顶部栏 */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-bold text-lg">Test</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      <div className="flex">
        {/* 侧边栏 */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r transition-all duration-300',
            isCollapsed ? 'w-16' : 'w-64',
            isMobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2',
                isCollapsed && 'justify-center w-full'
              )}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              {!isCollapsed && <span className="font-bold text-lg">Test</span>}
            </Link>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronLeft size={18} />
              </Button>
            )}
            {isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 bg-white dark:bg-slate-900 border rounded-full"
                onClick={() => setIsCollapsed(false)}
              >
                <ChevronRight size={14} />
              </Button>
            )}
          </div>

          {/* 导航 */}
          <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
            {mainNavItems.map((item) => (
              <NavItemComponent
                key={item.id}
                item={item}
                isActive={isItemActive(item)}
                collapsed={isCollapsed}
                expanded={expandedItems.includes(item.id)}
                onToggle={() => toggleExpanded(item.id)}
              />
            ))}

            {/* 设置 */}
            <div className="pt-4 mt-4 border-t">
              <NavItemComponent
                item={settingsNav}
                isActive={isItemActive(settingsNav)}
                collapsed={isCollapsed}
                expanded={expandedItems.includes(settingsNav.id)}
                onToggle={() => toggleExpanded(settingsNav.id)}
              />
            </div>
          </nav>

          {/* 底部用户区 */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white dark:bg-slate-900">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-2',
                    isCollapsed && 'justify-center p-2'
                  )}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {session?.user?.name || session?.user?.email}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {session?.user?.role?.toLowerCase()}
                      </p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <User className="mr-2 h-4 w-4" />
                    个人设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="mr-2 h-4 w-4" />
                    主题
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {themes.map((t) => (
                      <DropdownMenuItem
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                      >
                        <t.icon className="mr-2 h-4 w-4" />
                        {t.label}
                        {theme === t.value && (
                          <span className="ml-auto text-blue-600">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* 遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 主内容区 */}
        <main className="flex-1 min-w-0">
          {/* 顶部栏 */}
          <header className="sticky top-0 z-20 flex items-center justify-end gap-4 px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b">
            <NotificationBell />
          </header>

          {/* 内容 */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
