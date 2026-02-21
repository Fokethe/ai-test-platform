'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  LayoutGrid,
  FolderKanban,
  Play,
  BarChart3,
  Settings,
  LogOut,
  User,
  Layers,
  Menu,
  X,
  Keyboard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Palette,
  BookOpen,
  Brain,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HOTKEYS_HELP } from '@/lib/hooks/use-hotkeys';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { cn } from '@/lib/utils';

// 侧边栏导航项配置
const sidebarItems = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/dashboard' },
  { icon: LayoutGrid, label: '工作空间', href: '/workspaces' },
  { icon: FolderKanban, label: '用例库', href: '/testcases' },
  { icon: Sparkles, label: 'AI 生成', href: '/ai-generate' },
  { icon: Layers, label: '测试套件', href: '/test-suites' },
  { icon: Play, label: '执行历史', href: '/executions' },
  { icon: BarChart3, label: '报告中心', href: '/reports' },
  { icon: BookOpen, label: '知识库', href: '/knowledge' },
  { icon: Brain, label: 'AI 设置', href: '/ai-settings' },
];

// 管理员菜单
const adminItems = [
  { icon: User, label: '用户管理', href: '/admin/users' },
  { icon: FileText, label: '日志管理', href: '/admin/logs' },
];

// 主题配置
const themes = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '自动', icon: Monitor },
];

/**
 * 导航项组件 - 支持展开/收起状态
 */
interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive, onClick, collapsed }: NavItemProps) {
  return (
    <PrefetchLink
      href={href}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center rounded-xl transition-all duration-300 ease-in-out min-h-[44px]',
        'hover:scale-[1.02] active:scale-[0.98]',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        isActive
          ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 text-blue-600 dark:from-blue-500/20 dark:to-blue-600/10 dark:text-blue-400 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/50'
      )}
    >
      <Icon size={20} className={cn('shrink-0', isActive && 'animate-pulse-once')} />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-300 ease-in-out',
          collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
        )}
      >
        {label}
      </span>
    </PrefetchLink>
  );
}

/**
 * 主题子菜单组件
 */
function ThemeSubMenu() {
  const { theme, setTheme } = useTheme();
  
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="py-2">
        <Palette className="mr-2 h-4 w-4 text-slate-500" />
        主题设置
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-36">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center cursor-pointer',
              theme === value && 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
            {theme === value && (
              <span className="ml-auto text-xs">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * Header主题切换按钮（简化版）
 */
function ThemeToggleButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      onClick={toggleTheme}
      title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}

/**
 * 简化用户菜单（Header用）
 */
function UserMenuSimple({ 
  user, 
  onSignOut 
}: { 
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 w-9 p-0 rounded-full"
        >
          <UserAvatar 
            name={user?.name} 
            email={user?.email} 
            size="sm" 
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* 用户信息头部 */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <UserAvatar 
            name={user?.name} 
            email={user?.email} 
            size="md" 
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {user?.name || '用户'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </span>
          </div>
        </div>
        
        <DropdownMenuItem asChild>
          <PrefetchLink href="/settings/profile" className="flex items-center cursor-pointer py-2">
            <User className="mr-2 h-4 w-4 text-slate-500" />
            个人设置
          </PrefetchLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <PrefetchLink href="/settings" className="flex items-center cursor-pointer py-2">
            <Settings className="mr-2 h-4 w-4 text-slate-500" />
            系统设置
          </PrefetchLink>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onSignOut}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 py-2"
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 主题切换按钮组件（侧边栏用）
 */
function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // 获取当前主题图标
  const getCurrentIcon = () => {
    if (resolvedTheme === 'dark') return <Moon className="h-4 w-4" />;
    return <Sun className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 text-slate-600 dark:text-slate-400 min-h-[44px]',
            'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-all duration-300',
            collapsed && 'justify-center px-2'
          )}
        >
          {getCurrentIcon()}
          <span
            className={cn(
              'transition-all duration-300 ease-in-out',
              collapsed ? 'w-0 opacity-0 overflow-hidden hidden' : 'w-auto opacity-100 inline'
            )}
          >
            主题
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center cursor-pointer',
              theme === value && 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
            {theme === value && (
              <span className="ml-auto text-xs">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 用户头像组件
 */
function UserAvatar({ 
  name, 
  email, 
  size = 'md' 
}: { 
  name?: string | null; 
  email?: string | null; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const initial = name?.[0] || email?.[0] || 'U';
  
  // 根据首字母生成一致的颜色
  const colors = [
    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  ];
  
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const colorClass = colors[colorIndex];

  return (
    <Avatar className={cn(sizeClasses[size], 'ring-2 ring-white dark:ring-slate-800 shadow-sm')}>      
      <AvatarFallback className={cn('font-medium', colorClass)}>
        {initial.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { resolvedTheme } = useTheme();
  
  // 状态管理
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-blue-400/30"></div>
        </div>
      </div>
    );
  }

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  /**
   * 侧边栏内容组件
   */
  const SidebarContent = () => (
    <>
      {/* Logo区域 */}
      <div className={cn(
        'h-16 flex items-center border-b border-slate-200/50 dark:border-slate-700/50',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
        sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        <Link 
          href="/workspaces" 
          className={cn(
            'flex items-center gap-2 transition-all duration-300',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <span className="text-2xl hover:scale-110 transition-transform duration-200">🧪</span>
          <span 
            className={cn(
              'font-bold text-lg bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent',
              'transition-all duration-300 ease-in-out whitespace-nowrap',
              sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
            )}
          >
            AI Test
          </span>
        </Link>
        
        {/* 展开/收起按钮 - 仅在桌面端显示 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'hidden md:flex h-8 w-8 rounded-lg',
            'hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300',
            sidebarCollapsed && 'rotate-180'
          )}
          title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {sidebarItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname.startsWith(item.href)}
            onClick={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
          />
        ))}
        {/* 管理员菜单 - 仅对管理员显示 */}
        {session?.user?.role === 'ADMIN' && adminItems.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname.startsWith(item.href)}
            onClick={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* 底部 - 仅显示用户头像 */}
      <div className={cn(
        'p-3 border-t border-slate-200/50 dark:border-slate-700/50',
        'bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl'
      )}>
        <div className={cn(
          'flex items-center',
          sidebarCollapsed ? 'justify-center' : 'justify-start gap-3 px-2'
        )}>
          <UserAvatar 
            name={session?.user?.name} 
            email={session?.user?.email} 
            size="sm" 
          />
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                {session?.user?.name || '用户'}
              </span>
              <span className="text-xs text-slate-400 truncate max-w-[120px]">
                {session?.user?.email}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Desktop Sidebar - 带动画宽度变化 */}
      <aside 
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
          'border-r border-slate-200/50 dark:border-slate-700/50',
          'transition-all duration-300 ease-in-out',
          sidebarWidth
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 flex-col z-50',
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
          'border-r border-slate-200/50 dark:border-slate-700/50',
          'transform transition-transform duration-300 ease-in-out md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-slate-700/50 md:hidden">
          <span className="font-bold text-slate-800 dark:text-slate-100">菜单</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(false)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          'flex-1 min-w-0 overflow-auto',
          'transition-all duration-300 ease-in-out',
          'md:ml-16',
          !sidebarCollapsed && 'md:ml-64'
        )}
      >
        {/* Mobile Header */}
        <div className={cn(
          'md:hidden flex items-center justify-between p-4 sticky top-0 z-30',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
          'border-b border-slate-200/50 dark:border-slate-700/50'
        )}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(true)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
          <span className="font-bold text-slate-800 dark:text-slate-100">AI Test Platform</span>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
        
        {/* Desktop Header */}
        <div className={cn(
          'hidden md:flex items-center justify-end p-4 sticky top-0 z-30',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
          'border-b border-slate-200/50 dark:border-slate-700/50'
        )}>
          <div className="flex items-center gap-3">
            {/* 快捷键帮助按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setHotkeysOpen(true)}
              title="快捷键"
            >
              <Keyboard className="h-5 w-5" />
            </Button>
            
            {/* 主题切换按钮 */}
            <ThemeToggleButton />
            
            {/* 通知铃铛 */}
            <NotificationBell />
            
            {/* 简化用户菜单 */}
            <UserMenuSimple 
              user={session?.user}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
        
        {/* 页面内容 */}
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* 快捷键帮助对话框 */}
      <Dialog open={hotkeysOpen} onOpenChange={setHotkeysOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              键盘快捷键
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {HOTKEYS_HELP.map((hotkey, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="text-slate-600 dark:text-slate-400">{hotkey.description}</span>
                <div className="flex gap-1">
                  {hotkey.keys.map((key, kIndex) => (
                    <kbd
                      key={kIndex}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono text-slate-700 dark:text-slate-300"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
