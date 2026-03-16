/**
 * BentoCard - Bento风格卡片组件
 * 统一整个系统的卡片样式
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'featured' | 'glass' | 'bordered';
  hover?: boolean;
  onClick?: () => void;
}

export function BentoCard({
  children,
  className,
  variant = 'default',
  hover = true,
  onClick,
}: BentoCardProps) {
  const variantStyles = {
    default: 'bento-card',
    featured: 'bento-card-featured',
    glass: 'bento-card-glass',
    bordered: 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
  };

  return (
    <div
      className={cn(
        variantStyles[variant],
        hover && 'hover:scale-[1.02]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Bento网格容器
interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
}

export function BentoGrid({ children, className, cols = 12 }: BentoGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'bento-grid',
  };

  return (
    <div className={cn('grid gap-4', colClasses[cols], className)}>
      {children}
    </div>
  );
}

// Bento网格项
interface BentoItemProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  rowSpan?: 1 | 2;
}

export function BentoItem({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
}: BentoItemProps) {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
    6: 'col-span-1 md:col-span-3 lg:col-span-6',
    8: 'col-span-1 md:col-span-4 lg:col-span-8',
    12: 'col-span-1 md:col-span-6 lg:col-span-12',
  };

  const rowClasses = {
    1: '',
    2: 'row-span-2',
  };

  return (
    <div className={cn(spanClasses[colSpan], rowClasses[rowSpan], className)}>
      {children}
    </div>
  );
}
