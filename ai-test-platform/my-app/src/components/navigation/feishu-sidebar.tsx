'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BarChart3,
  Beaker,
  BookOpen,
  Bug,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { GlobalSearch } from '@/components/global-search';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSystemLanguage } from '@/components/system-language-provider';
import { DEFAULT_ROLE_MENU_ACCESS, normalizeRole } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

const baseNavItems: Omit<NavItem, 'label'>[] = [
  { id: 'dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'projects', icon: FolderKanban, href: '/projects' },
  { id: 'requirements', icon: FileText, href: '/requirements' },
  { id: 'tests', icon: Beaker, href: '/tests' },
  { id: 'executions', icon: Play, href: '/executions' },
  { id: 'issues', icon: Bug, href: '/issues' },
  { id: 'reports', icon: BarChart3, href: '/reports' },
  { id: 'knowledge', icon: BookOpen, href: '/knowledge' },
];

const navLabels: Record<string, { zh: string; en: string }> = {
  dashboard: { zh: '\u5de5\u4f5c\u53f0', en: 'Dashboard' },
  projects: { zh: '\u9879\u76ee\u7ba1\u7406', en: 'Projects' },
  requirements: { zh: '\u9700\u6c42\u7ba1\u7406', en: 'Requirements' },
  tests: { zh: '\u6d4b\u8bd5\u8bbe\u8ba1', en: 'Tests' },
  executions: { zh: '\u6d4b\u8bd5\u6267\u884c', en: 'Executions' },
  issues: { zh: '\u7f3a\u9677\u7ba1\u7406', en: 'Issues' },
  reports: { zh: '\u62a5\u544a\u4e2d\u5fc3', en: 'Reports' },
  knowledge: { zh: '\u77e5\u8bc6\u5e93', en: 'Knowledge' },
};

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
        isActive ? 'text-[var(--electric)] bg-[#edf3ff]' : 'text-[#1f2329] hover:bg-[#f5f6f7]'
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive ? (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--electric)] rounded-r-full" />
      ) : null}
      <Icon
        size={20}
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive ? 'text-[var(--electric)]' : 'text-[#646a73] group-hover:text-[#1f2329]'
        )}
      />
      {!collapsed ? <span className="text-sm font-medium truncate">{item.label}</span> : null}
      {!collapsed && item.badge ? (
        <span className="ml-auto px-1.5 py-0.5 text-xs bg-[#3370ff] text-white rounded-full">
          {item.badge}
        </span>
      ) : null}
      {collapsed && item.badge ? (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
      ) : null}
    </Link>
  );
}

export default function FeishuLayout({ children }: { children: ReactNode }) {
  const { language, t } = useSystemLanguage();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [allowedMenuKeys, setAllowedMenuKeys] = useState<string[] | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setAllowedMenuKeys(null);
      return;
    }

    let activeController: AbortController | null = null;

    const refreshPermissions = () => {
      const role = normalizeRole(session.user.role);
      setAllowedMenuKeys(DEFAULT_ROLE_MENU_ACCESS[role]);

      if (activeController) {
        activeController.abort();
      }
      activeController = new AbortController();

      fetch('/api/auth/me/menu-permissions', {
        cache: 'no-store',
        signal: activeController.signal,
      })
        .then(async (response) => {
          const payload = await response.json();
          if (payload?.code === 0 && Array.isArray(payload?.data?.menuKeys)) {
            setAllowedMenuKeys(payload.data.menuKeys);
          }
        })
        .catch(() => {
          // keep role-based fallback
        });
    };

    const onPermissionsUpdated = () => {
      refreshPermissions();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'menu_permissions_version') {
        refreshPermissions();
      }
    };

    refreshPermissions();
    window.addEventListener('menu-permissions-updated', onPermissionsUpdated as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      if (activeController) {
        activeController.abort();
      }
      window.removeEventListener(
        'menu-permissions-updated',
        onPermissionsUpdated as EventListener
      );
      window.removeEventListener('storage', onStorage);
    };
  }, [session?.user?.id, session?.user?.role]);

  const translatedNavItems = useMemo<NavItem[]>(
    () =>
      baseNavItems.map((item) => ({
        ...item,
        label: language === 'zh-CN' ? navLabels[item.id].zh : navLabels[item.id].en,
      })),
    [language]
  );

  const visibleNavItems = useMemo(() => {
    if (!allowedMenuKeys) {
      return translatedNavItems;
    }
    const allowed = new Set(allowedMenuKeys);
    return translatedNavItems.filter((item) => allowed.has(item.id));
  }, [allowedMenuKeys, translatedNavItems]);

  const canSeeSettings = !allowedMenuKeys || allowedMenuKeys.includes('settings');
  const canSeeRoleSettings = !allowedMenuKeys || allowedMenuKeys.includes('settingsRoles');
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const isDashboardWorkspace = pathname === '/dashboard';
  const appName = t('\u0041\u0049\u6d4b\u8bd5\u5e73\u53f0', 'AI Test Platform');

  return (
    <div className="min-h-screen bg-white">
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-[#1f2329]">{appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen((prev) => !prev)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      <div className="flex">
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-[#e4e6e8] transition-all duration-300',
            collapsed ? 'w-[72px]' : 'w-[240px]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-[#e4e6e8]">
            <Link href="/dashboard" className={cn('flex items-center gap-2', collapsed && 'justify-center w-full')}>
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {!collapsed ? <span className="font-semibold text-base text-[#1f2329]">{appName}</span> : null}
            </Link>
            {!collapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-7 w-7 text-[#8f959e] hover:text-[#1f2329]"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft size={16} />
              </Button>
            ) : null}
          </div>

          <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-140px)] scrollbar-thin">
            {visibleNavItems.map((item) => (
              <NavLink key={item.id} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
            ))}

            <div className="my-2 border-t border-[#e4e6e8]" />

            {canSeeSettings ? (
              <NavLink
                item={{ id: 'settings', label: t('\u8bbe\u7f6e', 'Settings'), icon: Settings, href: '/settings' }}
                isActive={pathname.startsWith('/settings')}
                collapsed={collapsed}
              />
            ) : null}
          </nav>

          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 bg-white border border-[#e4e6e8] rounded-full shadow-sm z-50"
              onClick={() => setCollapsed(false)}
            >
              <ChevronRight size={14} />
            </Button>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#e4e6e8] bg-white">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn('w-full justify-start gap-2 hover:bg-[#f5f6f7]', collapsed && 'justify-center p-2')}
                >
                  <Avatar className="w-8 h-8 border border-[#e4e6e8]">
                    <AvatarFallback className="bg-[#3370ff]/10 text-[#3370ff] text-sm font-medium">
                      {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed ? (
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium text-[#1f2329] truncate">
                        {session?.user?.name || session?.user?.email}
                      </p>
                      <p className="text-xs text-[#8f959e] capitalize">{session?.user?.role?.toLowerCase()}</p>
                    </div>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('\u4e2a\u4eba\u8bbe\u7f6e', 'Profile')}
                  </Link>
                </DropdownMenuItem>
                {canSeeRoleSettings ? (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/roles" className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      {t('\u89d2\u8272\u4e0e\u83dc\u5355', 'Role & Menu')}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('\u9000\u51fa\u767b\u5f55', 'Sign Out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
        ) : null}

        <main className="flex-1 min-w-0 bg-[#f5f6f7]">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 bg-white/80 backdrop-blur border-b border-[#e4e6e8]">
            <div className="hidden lg:block flex-1 max-w-xl">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <NotificationBell />
            </div>
          </header>
          <div className={cn(isDashboardWorkspace ? 'p-0' : 'p-6')}>{children}</div>
        </main>
      </div>
    </div>
  );
}
