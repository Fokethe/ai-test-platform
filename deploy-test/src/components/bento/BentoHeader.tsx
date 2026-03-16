/**
 * BentoHeader - 统一页面头部组件
 * 所有列表页使用一致的头部风格
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface BentoHeaderProps {
  title: string;
  description?: string;
  count?: number;
  countLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export function BentoHeader({
  title,
  description,
  count,
  countLabel = '个项目',
  actionLabel,
  actionHref,
  actionIcon = <Plus className="w-4 h-4 mr-2" />,
  onAction,
  onRefresh,
  isRefreshing,
  secondaryActions,
  className,
}: BentoHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2 mt-1">
          {description && (
            <p className="text-slate-500">{description}</p>
          )}
          {count !== undefined && (
            <span className="text-slate-400">
              共 {count} {countLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {secondaryActions}
        
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
        )}

        {(actionHref || onAction) && (
          <Button
            onClick={onAction}
            className="shrink-0 bg-[var(--electric)] hover:bg-[var(--electric)]/90"
            asChild={!!actionHref}
          >
            {actionHref ? (
              <Link href={actionHref}>
                {actionIcon}
                {actionLabel}
              </Link>
            ) : (
              <>
                {actionIcon}
                {actionLabel}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
