/**
 * 可观测性模块统一导出
 * Phase 8: Langfuse Observability
 */

export {
  // 客户端
  LangfuseClient,
  initLangfuse,
  getLangfuse,
  getConfigFromEnv,
  createTrace,
  createGeneration,
} from './langfuse-client';

// 导出类型
export type {
  LangfuseConfig,
  TraceContext,
  TraceResult,
  SpanConfig,
  SpanResult,
  GenerationConfig,
  GenerationOutput,
  ObservabilityEvent,
  PerformanceMetrics,
  QualityScore,
  ILangfuseClient,
  CostTrackingConfig,
  CostStatistics,
  ObservabilityConfig,
} from './types';