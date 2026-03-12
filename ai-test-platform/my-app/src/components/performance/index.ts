/**
 * 性能优化组件库
 * 
 * 提供 React 性能优化的各类组件，包括：
 * - 错误边界 (ErrorBoundary)
 * - 虚拟列表 (VirtualList)
 * - 优化图片 (OptimizedImage)
 * - 延迟加载 (DeferredComponent)
 */

// 错误边界
export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  type ErrorBoundaryProps,
  type ErrorBoundaryState,
  type FallbackProps,
} from './error-boundary';

// 虚拟列表
export {
  VirtualList,
  type VirtualListProps,
  type VirtualListItem,
  type VirtualListRef,
} from './virtual-list';

// 优化图片
export {
  OptimizedImage,
  type OptimizedImageProps,
  type ImageLoadingStrategy,
  type ImageFormat,
} from './optimized-image';

// 延迟加载组件
export {
  DeferredComponent,
  AsyncComponentLoader,
  TransitionLoader,
  DeferredData,
  PriorityRenderer,
  type DeferredComponentProps,
  type AsyncComponentLoaderProps,
  type TransitionLoaderProps,
  type DeferredDataProps,
  type PriorityRendererProps,
} from './deferred-component';
