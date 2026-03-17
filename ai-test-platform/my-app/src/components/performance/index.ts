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
} from './virtual-list';

// 优化图片
export {
  OptimizedImage,
} from './optimized-image';

// 延迟加载组件
export {
  DeferredComponent,
  AsyncComponentLoader,
  TransitionLoader,
  DeferredData,
  PriorityRenderer,
} from './deferred-component';
