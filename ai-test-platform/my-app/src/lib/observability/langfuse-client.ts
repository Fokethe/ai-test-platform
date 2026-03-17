/**
 * Langfuse 客户端封装
 * Phase 8.1: Langfuse 基础集成
 *
 * 提供 AI 调用全链路追踪能力：
 * - Trace: 端到端请求追踪
 * - Span: 子任务追踪
 * - Generation: LLM 调用追踪
 * - Cost: Token 成本统计
 */

import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
import { randomUUID } from 'crypto';
import {
  LangfuseConfig,
  TraceContext,
  TraceResult,
  SpanConfig,
  SpanResult,
  GenerationConfig,
  GenerationOutput,
  ObservabilityEvent,
  ILangfuseClient,
  CostTrackingConfig,
  CostStatistics,
  ObservabilityConfig,
} from './types';

/** 默认模型价格配置 (USD per 1K tokens) */
const DEFAULT_MODEL_PRICES: CostTrackingConfig['modelPrices'] = {
  'kimi-k2.5': { input: 0.001, output: 0.001 },
  'kimi-k2': { input: 0.0008, output: 0.0008 },
  'qwen3-32b': { input: 0.0005, output: 0.0005 },
  'qwen3-72b': { input: 0.002, output: 0.002 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'bge-m3': { input: 0, output: 0 },
};

/** Langfuse 客户端类 */
export class LangfuseClient implements ILangfuseClient {
  private client: Langfuse;
  private config: ObservabilityConfig;
  private traces: Map<string, LangfuseTraceClient> = new Map();
  private costStats: CostStatistics;

  constructor(config: ObservabilityConfig) {
    this.config = config;
    
    this.client = new Langfuse({
      publicKey: config.langfuse.publicKey,
      secretKey: config.langfuse.secretKey,
      baseUrl: config.langfuse.baseUrl,
      environment: config.langfuse.environment || process.env.NODE_ENV || 'development',
      release: config.langfuse.release || process.env.APP_VERSION || '1.0.0',
      enabled: config.langfuse.enabled !== false,
    });

    this.costStats = {
      totalCost: 0,
      inputCost: 0,
      outputCost: 0,
      callCount: 0,
      byModel: {},
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
    };
  }

  createTrace(name: string, context: Partial<TraceContext> = {}): TraceResult {
    const traceId = context.traceId || randomUUID();
    
    const trace = this.client.trace({
      id: traceId,
      name,
      sessionId: context.sessionId,
      userId: context.userId,
      metadata: {
        ...context.metadata,
        timestamp: Date.now(),
      },
    });

    this.traces.set(traceId, trace);

    return {
      trace,
      end: async (output?: unknown, metadata?: Record<string, unknown>) => {
        trace.update({
          output: this.sanitizeData(output),
          metadata: {
            ...metadata,
            endTimestamp: Date.now(),
          },
        });
        await this.flushAsync();
      },
    };
  }

  createSpan(traceId: string, config: SpanConfig): SpanResult {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const span = trace.span({
      name: config.name,
      input: this.sanitizeData(config.input),
      metadata: config.metadata,
    });

    return {
      span,
      end: async (output?: unknown, metadata?: Record<string, unknown>) => {
        span.end({
          output: this.sanitizeData(output),
          metadata: {
            ...metadata,
            endTimestamp: Date.now(),
          },
        });
      },
    };
  }

  createGeneration(traceId: string, config: GenerationConfig): SpanResult {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const generation = trace.generation({
      name: config.name,
      model: config.model,
      input: this.sanitizeData(config.input),
      modelParameters: config.modelParameters,
      metadata: {
        ...config.metadata,
        startTimestamp: Date.now(),
      },
    });

    return {
      span: generation,
      end: async (output?: unknown, metadata?: Record<string, unknown> | GenerationOutput['usage']) => {
        const usage = metadata as GenerationOutput['usage'] | undefined;
        const cost = this.calculateCost(config.model, usage);
        
        generation.end({
          output: this.sanitizeData(output),
          usage: usage ? {
            input: usage.inputTokens,
            output: usage.outputTokens,
            total: usage.totalTokens,
          } : undefined,
          metadata: {
            cost,
            endTimestamp: Date.now(),
          },
        });

        this.updateCostStats(config.model, cost, usage);
      },
    };
  }

  recordEvent(event: ObservabilityEvent): void {
    if (!this.config.langfuse.enabled) return;

    const trace = this.traces.get(event.traceId);
    if (!trace) {
      console.warn(`[Langfuse] Trace not found for event: ${event.traceId}`);
      return;
    }

    trace.event({
      name: event.type,
      metadata: {
        ...(event.data as Record<string, unknown> || {}),
        timestamp: event.timestamp,
      },
    });
  }

  getCostStatistics(): CostStatistics {
    return {
      ...this.costStats,
      timeRange: {
        start: this.costStats.timeRange.start,
        end: new Date(),
      },
    };
  }

  resetCostStatistics(): void {
    this.costStats = {
      totalCost: 0,
      inputCost: 0,
      outputCost: 0,
      callCount: 0,
      byModel: {},
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
    };
  }

  checkBudget(): { exceeded: boolean; remaining: number; usage: number } {
    const config = this.config.costTracking;
    if (!config?.dailyBudget) {
      return { exceeded: false, remaining: Infinity, usage: 0 };
    }

    const usage = (this.costStats.totalCost / config.dailyBudget) * 100;
    const remaining = config.dailyBudget - this.costStats.totalCost;

    return {
      exceeded: remaining < 0,
      remaining,
      usage,
    };
  }

  async flushAsync(): Promise<void> {
    if (!this.config.langfuse.enabled) return;
    await this.client.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    if (!this.config.langfuse.enabled) return;
    await this.client.shutdownAsync();
  }

  private sanitizeData(data: unknown): unknown {
    if (!this.config.recordIO) return undefined;
    if (!data) return data;

    const sensitiveFields = this.config.sensitiveFields || ['password', 'token', 'secret', 'key'];
    
    if (typeof data === 'string') {
      let sanitized = data;
      for (const field of sensitiveFields) {
        const regex = new RegExp(`"${field}":"[^"]*"`, 'gi');
        sanitized = sanitized.replace(regex, `"${field}":"***"`);
      }
      return sanitized;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          sanitized[key] = '***';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  }

  private calculateCost(model: string, usage?: GenerationOutput['usage']): number {
    if (!usage) return 0;

    const prices = this.config.costTracking?.modelPrices || DEFAULT_MODEL_PRICES;
    const modelPrice = prices[model] || { input: 0.001, output: 0.001 };

    const inputCost = (usage.inputTokens / 1000) * modelPrice.input;
    const outputCost = (usage.outputTokens / 1000) * modelPrice.output;

    return Number((inputCost + outputCost).toFixed(6));
  }

  private updateCostStats(
    model: string,
    cost: number,
    usage?: GenerationOutput['usage']
  ): void {
    this.costStats.totalCost += cost;
    this.costStats.callCount += 1;

    if (usage) {
      const inputCost = (usage.inputTokens / 1000) * 
        (this.config.costTracking?.modelPrices?.[model]?.input || 0.001);
      const outputCost = (usage.outputTokens / 1000) * 
        (this.config.costTracking?.modelPrices?.[model]?.output || 0.001);
      
      this.costStats.inputCost += inputCost;
      this.costStats.outputCost += outputCost;
    }

    if (!this.costStats.byModel[model]) {
      this.costStats.byModel[model] = { cost: 0, calls: 0, tokens: 0 };
    }
    
    this.costStats.byModel[model].cost += cost;
    this.costStats.byModel[model].calls += 1;
    if (usage) {
      this.costStats.byModel[model].tokens += usage.totalTokens;
    }

    this.costStats.timeRange.end = new Date();
  }
}

let globalClient: LangfuseClient | null = null;

export function initLangfuse(config: ObservabilityConfig): LangfuseClient {
  globalClient = new LangfuseClient(config);
  return globalClient;
}

export function getLangfuse(): LangfuseClient {
  if (!globalClient) {
    const envConfig = getConfigFromEnv();
    if (envConfig) {
      return initLangfuse(envConfig);
    }
    throw new Error('Langfuse client not initialized. Call initLangfuse() first.');
  }
  return globalClient;
}

export function getConfigFromEnv(): ObservabilityConfig | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;

  if (!publicKey || !secretKey || !baseUrl) {
    console.warn('[Langfuse] Missing environment variables, observability disabled');
    return null;
  }

  const dailyBudget = process.env.LANGFUSE_DAILY_BUDGET 
    ? parseFloat(process.env.LANGFUSE_DAILY_BUDGET) 
    : undefined;

  return {
    langfuse: {
      publicKey,
      secretKey,
      baseUrl,
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION,
      enabled: process.env.LANGFUSE_ENABLED !== 'false',
    },
    costTracking: {
      modelPrices: DEFAULT_MODEL_PRICES,
      dailyBudget,
      alertThreshold: 80,
    },
    sampleRate: parseFloat(process.env.LANGFUSE_SAMPLE_RATE || '1'),
    recordIO: process.env.LANGFUSE_RECORD_IO !== 'false',
    sensitiveFields: process.env.LANGFUSE_SENSITIVE_FIELDS?.split(',') || 
      ['password', 'token', 'secret', 'key', 'apiKey'],
  };
}

export function createTrace(name: string, context?: Partial<TraceContext>): TraceResult {
  return getLangfuse().createTrace(name, context);
}

export function createGeneration(traceId: string, config: GenerationConfig): SpanResult {
  return getLangfuse().createGeneration(traceId, config);
}

export * from './types';
