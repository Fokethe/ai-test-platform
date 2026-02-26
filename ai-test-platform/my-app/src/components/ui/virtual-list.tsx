/**
 * Virtual List Component
 * 虚拟列表组件 - 用于优化大数据列表渲染
 */

'use client';

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 600,
  overscan = 5,
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const totalHeight = items.length * itemHeight;

  useEffect(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    setVisibleRange({ start, end });
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleRange.start + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 简化版：无限滚动加载
interface InfiniteScrollProps<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  renderItem: (item: T, index: number) => ReactNode;
  loader?: ReactNode;
  endMessage?: ReactNode;
  className?: string;
}

export function InfiniteScroll<T>({
  items,
  hasMore,
  isLoading,
  onLoadMore,
  renderItem,
  loader,
  endMessage,
  className = '',
}: InfiniteScrollProps<T>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className={className}>
      {items.map((item, index) => renderItem(item, index))}
      
      <div ref={loadMoreRef} className="py-4">
        {isLoading && (loader || (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ))}
        {!hasMore && !isLoading && items.length > 0 && (endMessage || (
          <p className="text-center text-slate-400 text-sm">没有更多数据了</p>
        ))}
      </div>
    </div>
  );
}

// 使用 requestIdleCallback 的延迟渲染列表
interface DeferredListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  batchSize?: number;
  className?: string;
}

export function DeferredList<T>({
  items,
  renderItem,
  batchSize = 20,
  className = '',
}: DeferredListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const frameRef = useRef<number>();

  useEffect(() => {
    setVisibleCount(batchSize);
    
    const loadMore = () => {
      setVisibleCount((prev) => {
        if (prev >= items.length) return prev;
        return Math.min(prev + batchSize, items.length);
      });
    };

    const scheduleLoad = () => {
      if (visibleCount >= items.length) return;

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          loadMore();
          frameRef.current = requestAnimationFrame(scheduleLoad);
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          loadMore();
          frameRef.current = requestAnimationFrame(scheduleLoad);
        }, 16);
      }
    };

    frameRef.current = requestAnimationFrame(scheduleLoad);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={className}>
      {visibleItems.map((item, index) => renderItem(item, index))}
      {visibleCount < items.length && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
