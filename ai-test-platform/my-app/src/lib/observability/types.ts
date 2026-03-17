/**
 * Langfuse 可观测性类型定义
 * Phase 8: Langfuse Observability
 */

import type { LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';

// Re-export types for Jest compatibility
export { LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient };

/** Langfuse 配置接口 */
export interface LangfuseConfig {
  /** Langfuse 公钥 */
  publicKey: string;
  /** Langfuse 私钥 */
  secretKey: string;
  /** Langfuse 服务地址 */
  baseUrl: string;
  /** 环境标识 */
  environment?: string;
  /** 应用版本 */
  release?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/** 追踪上下文 */
export interface TraceContext {
  /** 追踪 ID */
  traceId: string;
  /** 会话 ID */
  sessionId?: string;
  /** 用户 ID */
  userId?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** Span 配置 */
export interface SpanConfig {
  /** Span 名称 */
  name: string;
  /** Span 类型 */
  type?: 'span' | 'llm' | 'tool' | 'workflow';
  /** 输入数据 */
  input?: unknown;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 父 Span ID */
  parentObservationId?: string;
}

/** Generation 配置 */
export interface GenerationConfig {
  /** 生成任务名称 */
  name: string;
  /** 模型名称 */
  model: string;
  /** 输入 Prompt */
  input: unknown;
  /** 模型参数 */
  modelParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** Generation 输出 */
export interface GenerationOutput {
  /** 生成的内容 */
  output: unknown;
  /** Token 使用量 */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;
  };
}

/** 可观测性事件 */
export interface ObservabilityEvent {
  /** 事件类型 */
  type: 'trace_start' | 'trace_end' | 'span_start' | 'span_end' | 'generation_start' | 'generation_end' | 'error';
  /** 时间戳 */
  timestamp: number;
  /** 追踪 ID */
  traceId: string;
  /** 事件数据 */
  data: unknown;
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 延迟 (ms) */
  latency: number;
  /** Token 使用量 */
  tokenUsage: number;
  /** 成本 (USD) */
  cost: number;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
}

/** 质量评分 */
export interface QualityScore {
  /** 总分 (0-100) */
  overall: number;
  /** 准确性评分 */
  accuracy?: number;
  /** 完整性评分 */
  completeness?: number;
  /** 一致性评分 */
  consistency?: number;
  /** 人工评分 */
  humanRating?: number;
  /** 评分详情 */
  details?: Record<string, number>;
}

/** 追踪结果 */
export interface TraceResult {
  /** 追踪客户端 */
  trace: LangfuseTraceClient;
  /** 结束追踪的回调 */
  end: (output?: unknown, metadata?: Record<string, unknown>) => Promise<void>;
}

/** Span 结果 */
export interface SpanResult {
  /** Span 客户端 */
  span: LangfuseSpanClient | LangfuseGenerationClient;
  /** 结束 Span 的回调 */
  end: (output?: unknown, metadata?: Record<string, unknown> | GenerationOutput['usage']) => Promise<void>;
}

/** Langfuse 客户端接口 */
export interface ILangfuseClient {
  /** 创建追踪 */
  createTrace(name: string, context?: Partial<TraceContext>): TraceResult;
  
  /** 创建 Span */
  createSpan(traceId: string, config: SpanConfig): SpanResult;
  
  /** 创建 Generation */
  createGeneration(traceId: string, config: GenerationConfig): SpanResult;
  
  /** 记录事件 */
  recordEvent(event: ObservabilityEvent): void;
  
  /** 刷新数据 */
  flushAsync(): Promise<void>;
  
  /** 关闭客户端 */
  shutdownAsync(): Promise<void>;
}

/** 成本追踪配置 */
export interface CostTrackingConfig {
  /** 模型价格映射 (每 1K tokens) */
  modelPrices: Record<string, {
    input: number;
    output: number;
  }>;
  /** 每日预算限制 (USD) */
  dailyBudget?: number;
  /** 预警阈值 (%) */
  alertThreshold?: number;
}

/** 成本统计 */
export interface CostStatistics {
  /** 总成本 */
  totalCost: number;
  /** 输入 Token 成本 */
  inputCost: number;
  /** 输出 Token 成本 */
  outputCost: number;
  /** 调用次数 */
  callCount: number;
  /** 按模型统计 */
  byModel: Record<string, {
    cost: number;
    calls: number;
    tokens: number;
  }>;
  /** 时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
}

/** 可观测性配置 */
export interface ObservabilityConfig {
  /** Langfuse 配置 */
  langfuse: LangfuseConfig;
  /** 成本追踪配置 */
  costTracking?: CostTrackingConfig;
  /** 采样率 (0-1) */
  sampleRate?: number;
  /** 是否记录输入输出 */
  recordIO?: boolean;
  /** 敏感字段过滤 */
  sensitiveFields?: string[];
}
