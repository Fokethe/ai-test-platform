'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent, ReactNode, useCallback } from 'react';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
  title?: string;
}

// 预加载页面数据的 Link 组件
export function PrefetchLink({ 
  href, 
  children, 
  className, 
  onClick,
  prefetch = true,
  title,
}: PrefetchLinkProps) {
  const router = useRouter();

  // 鼠标悬停时预加载
  const handleMouseEnter = useCallback(() => {
    if (prefetch) {
      // 预加载路由
      router.prefetch(href);
      
      // 预加载页面数据（API端点）
      const apiEndpoints = getApiEndpoints(href);
      apiEndpoints.forEach(endpoint => {
        // 使用 fetch 预加载数据到浏览器缓存
        fetch(endpoint, { method: 'HEAD' }).catch(() => {});
      });
    }
  }, [href, prefetch, router]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
  };

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      prefetch={prefetch}
      title={title}
    >
      {children}
    </Link>
  );
}

// 根据页面路由获取对应的API端点
function getApiEndpoints(href: string): string[] {
  const endpoints: string[] = [];
  
  // 工作空间相关
  if (href === '/workspaces') {
    endpoints.push('/api/workspaces');
  } else if (href.startsWith('/workspaces/') && href.split('/').length === 3) {
    const id = href.split('/')[2];
    endpoints.push(`/api/workspaces/${id}`);
    endpoints.push(`/api/projects?workspaceId=${id}`);
  }
  
  // 测试用例相关
  else if (href === '/testcases') {
    endpoints.push('/api/testcases');
    endpoints.push('/api/pages');
  }
  
  // 执行历史相关
  else if (href === '/executions') {
    endpoints.push('/api/executions/status');
  } else if (href.startsWith('/executions/') && href.split('/').length === 3) {
    const id = href.split('/')[2];
    endpoints.push(`/api/executions/${id}`);
  }
  
  // 测试套件相关
  else if (href === '/test-suites') {
    endpoints.push('/api/test-suites');
  }
  
  // 报告相关
  else if (href === '/reports') {
    endpoints.push('/api/reports');
  }
  
  return endpoints;
}

// 导航项组件（用于侧边栏）
interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function NavItem({ href, icon: Icon, label, isActive, onClick }: NavItemProps) {
  return (
    <PrefetchLink
      href={href}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={20} />
      <span className="inline">{label}</span>
    </PrefetchLink>
  );
}
