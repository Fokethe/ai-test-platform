'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Beaker,
  Play,
  Bug,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { GlobalSearch } from '@/components/global-search';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ==================== 导航配置（飞书风格极简导航）====================

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '工作台',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'projects',
    label: '项目管理',
    icon: FolderKanban,
    href: '/projects',
  },
  {
    id: 'requirements',
    label: '需求管理',
    icon: FileText,
    href: '/requirements',
  },
  {
    id: 'tests',
    label: '测试设计',
    icon: Beaker,
    href: '/tests',
  },
  {
    id: 'executions',
    label: '测试执行',
    icon: Play,
    href: '/executions',
  },
  {
    id: 'issues',
    label: '缺陷管理',
    icon: Bug,
    href: '/issues',
  },
  {
    id: 'reports',
    label: '报告中心',
    icon: BarChart3,
    href: '/reports',
  },
  {
    id: 'knowledge',
    label: '知识库',
    icon: BookOpen,
    href: '/knowledge',
  },
];

// ==================== 飞书风格导航组件 ====================

interface FeishuNavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}

function FeishuNavItem({ item, isActive, collapsed }: FeishuNavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'text-[var(--electric)]'
          : 'text-[#1f2329] hover:bg-[#f5f6f7]'
      )}
      title={collapsed ? item.label : undefined}
    >
      {/* 选中状态左侧竖线 */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--electric)] rounded-r-full" />
      )}
      
      {/* 图标 */}
      <Icon 
        size={20} 
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive ? 'text-[var(--electric)]' : 'text-[#646a73] group-hover:text-[#1f2329]'
        )} 
      />
      
      {/* 文字 */}
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      
      {/* Badge */}
      {!collapsed && item.badge ? (
        <span className="ml-auto px-1.5 py-0.5 text-xs bg-[#3370ff] text-white rounded-full">
          {item.badge}
        </span>
      ) : null}
      
      {/* Collapsed badge indicator */}
      {collapsed && item.badge ? (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
      ) : null}
    </Link>
  );
}

// ==================== 飞书风格布局组件 ====================

export default function FeishuLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isItemActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (pathname.startsWith(item.href) && item.href !== '/dashboard') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 移动端顶部栏 */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-[#1f2329]">AI测试平台</span>
        </Link>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* 侧边栏 - 飞书极简风格 */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-[#e4e6e8] transition-all duration-300',
            isCollapsed ? 'w-[72px]' : 'w-[240px]',
            isMobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Logo 区域 */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-[#e4e6e8]">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2',
                isCollapsed && 'justify-center w-full'
              )}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-base text-[#1f2329]">AI测试平台</span>
              )}
            </Link>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-7 w-7 text-[#8f959e] hover:text-[#1f2329]"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronLeft size={16} />
              </Button>
            )}
          </div>

          {/* 导航区域 */}
          <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-140px)] scrollbar-thin">
            {mainNavItems.map((item) => (
              <FeishuNavItem
                key={item.id}
                item={item}
                isActive={isItemActive(item)}
                collapsed={isCollapsed}
              />
            ))}

            {/* 分隔线 */}
            <div className="my-2 border-t border-[#e4e6e8]" />

            {/* 设置 */}
            <FeishuNavItem
              item={{
                id: 'settings',
                label: '设置',
                icon: Settings,
                href: '/settings',
              }}
              isActive={pathname.startsWith('/settings')}
              collapsed={isCollapsed}
            />
          </nav>

          {/* 收起按钮（当 collapsed 时显示） */}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 bg-white border border-[#e4e6e8] rounded-full shadow-sm z-50"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight size={14} />
            </Button>
          )}

          {/* 底部用户区 */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#e4e6e8] bg-white">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-2 hover:bg-[#f5f6f7]',
                    isCollapsed && 'justify-center p-2'
                  )}
                >
                  <Avatar className="w-8 h-8 border border-[#e4e6e8]">
                    <AvatarFallback className="bg-[#3370ff]/10 text-[#3370ff] text-sm font-medium">
                      {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium text-[#1f2329] truncate">
                        {session?.user?.name || session?.user?.email}
                      </p>
                      <p className="text-xs text-[#8f959e] capitalize">
                        {session?.user?.role?.toLowerCase()}
                      </p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    个人设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* 遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 主内容区 */}
        <main className="flex-1 min-w-0 bg-[#f5f6f7]">
          {/* 顶部栏 */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 bg-white/80 backdrop-blur border-b border-[#e4e6e8]">
            <div className="hidden lg:block flex-1 max-w-xl">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <NotificationBell />
            </div>
          </header>

          {/* 内容 */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
