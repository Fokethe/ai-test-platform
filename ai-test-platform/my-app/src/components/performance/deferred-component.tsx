'use client';

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { useDeferredValue, useTransition } from 'react';

/**
 * 延迟加载组件 Props
 */
interface DeferredComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  timeout?: number;
}

/**
 * 延迟加载组件
 * 用于非关键内容的延迟渲染，优先保证主内容渲染
 */
export function DeferredComponent({
  children,
  fallback = <DeferredFallback />,
  timeout = 1000,
}: DeferredComponentProps) {
  const deferredChildren = useDeferredValue(children);
  const isStale = deferredChildren !== children;

  return (
    <div
      style={{
        opacity: isStale ? 0.7 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Suspense fallback={fallback}>
        {deferredChildren}
      </Suspense>
    </div>
  );
}

/**
 * 延迟回退组件
 */
function DeferredFallback() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}

/**
 * 异步组件加载器 Props
 */
interface AsyncComponentLoaderProps<T extends object> {
  loader: () => Promise<{ default: ComponentType<T> }>;
  props?: T;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * 异步组件加载器
 * 动态加载组件并处理加载状态和错误
 */
export function AsyncComponentLoader<T extends object>({
  loader,
  props = {} as T,
  fallback = <DeferredFallback />,
  errorFallback,
}: AsyncComponentLoaderProps<T>) {
  const LazyComponent = lazy(loader);

  return (
    <Suspense fallback={fallback}>
      <ErrorBoundary fallback={errorFallback}>
        <LazyComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

/**
 * 过渡加载器 Props
 */
interface TransitionLoaderProps {
  children: ReactNode;
  loading?: ReactNode;
}

/**
 * 过渡加载器
 * 使用 useTransition 处理状态更新，避免阻塞 UI
 */
export function TransitionLoader({
  children,
  loading = <DeferredFallback />,
}: TransitionLoaderProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          {loading}
        </div>
      )}
      {children}
    </>
  );
}

/**
 * 延迟数据展示 Props
 */
interface DeferredDataProps<T> {
  data: T;
  children: (data: T) => ReactNode;
  fallback?: ReactNode;
}

/**
 * 延迟数据展示
 * 用于大数据列表或复杂计算的延迟渲染
 */
export function DeferredData<T>({
  data,
  children,
  fallback = <DeferredFallback />,
}: DeferredDataProps<T>) {
  const deferredData = useDeferredValue(data);
  const isStale = deferredData !== data;

  if (isStale) {
    return <>{fallback}</>;
  }

  return <>{children(deferredData)}</>;
}

/**
 * 错误边界组件（内部使用）
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Async component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          组件加载失败，请刷新页面重试
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 优先级渲染器 Props
 */
interface PriorityRendererProps {
  highPriority: ReactNode;
  lowPriority: ReactNode;
  delay?: number;
}

/**
 * 优先级渲染器
 * 优先渲染高优先级内容，延迟渲染低优先级内容
 */
export function PriorityRenderer({
  highPriority,
  lowPriority,
  delay = 100,
}: PriorityRendererProps) {
  const [showLowPriority, setShowLowPriority] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLowPriority(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <>
      {highPriority}
      {showLowPriority && (
        <DeferredComponent fallback={<DeferredFallback />}>
          {lowPriority}
        </DeferredComponent>
      )}
    </>
  );
}

export default DeferredComponent;
