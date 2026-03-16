/**
 * LangChain 类型定义
 * TDD Round 1: LangChain 客户端封装
 */

export type AIProvider = 'kimi' | 'qwen' | 'openai' | 'deepseek';

export interface LangChainClientConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface GenerateResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: AIProvider;
}

export interface GenerateOptions {
  temperature?: number;
  model?: string;
  timeout?: number;
  stream?: boolean;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: GenerateResponse) => void;
  onError?: (error: Error) => void;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  maxTokens: number;
  costPer1kTokens: number;
}

// Provider 配置映射
export const PROVIDER_CONFIGS: Record<AIProvider, { baseUrl: string; defaultModel: string }> = {
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModel: 'qwen-3',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v3',
  },
};

// 模型成本配置 (USD per 1k tokens)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'kimi-k2.5': { input: 0.001, output: 0.002 },
  'qwen-3': { input: 0.002, output: 0.004 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'deepseek-v3': { input: 0.001, output: 0.002 },
};
