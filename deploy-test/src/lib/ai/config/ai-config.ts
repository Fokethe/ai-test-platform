/**
 * AI Configuration
 * AI服务集中配置
 */

import { ModelConfig, TaskType } from '../model-manager';

// LLM模型配置
export const LLM_MODELS: Record<string, ModelConfig> = {
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'kimi',
    apiKey: process.env.KIMI_API_KEY || '',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2.5'],
    priority: 1,
    isActive: true,
    costPer1KTokens: { input: 0.001, output: 0.002 }
  },
  'qwen3-32b': {
    id: 'qwen3-32b',
    name: 'Qwen3 32B',
    provider: 'qwen',
    apiKey: process.env.QWEN_API_KEY || '',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    models: ['qwen3-32b'],
    priority: 2,
    isActive: true,
    costPer1KTokens: { input: 0.0005, output: 0.001 }
  },
  'qwen3-72b': {
    id: 'qwen3-72b',
    name: 'Qwen3 72B',
    provider: 'qwen',
    apiKey: process.env.QWEN_API_KEY || '',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    models: ['qwen3-72b'],
    priority: 3,
    isActive: true,
    costPer1KTokens: { input: 0.002, output: 0.004 }
  }
};

// 任务类型到模型的映射
export const TASK_MODEL_MAPPING: Record<TaskType, string> = {
  requirement_analysis: 'qwen3-32b',    // Qwen: 推理能力强
  testpoint_generation: 'kimi-k2.5',    // Kimi: 中文好，成本低
  testcase_generation: 'kimi-k2.5',     // Kimi: 生成速度快
  quality_check: 'qwen3-32b',           // Qwen: 逻辑严谨
  code_review: 'qwen3-72b',             // Qwen 72B: 复杂分析
  document_analysis: 'kimi-k2.5'        // Kimi: 长文档处理
};

// Embedding配置
export const EMBEDDING_CONFIG = {
  type: 'local' as const,
  model: 'bge-m3',
  dimensions: 1024,
  local: {
    baseUrl: process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000',
    timeout: 30000,
    maxRetries: 3
  }
};

// RAG配置
export const RAG_CONFIG = {
  // 向量数据库
  vectorStore: {
    type: 'chroma' as const,
    path: process.env.CHROMA_DB_PATH || './data/chroma'
  },
  
  // 检索参数
  retrieval: {
    topK: 5,
    minSimilarity: 0.7,
    maxResults: 20
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24小时
    maxSize: 1000
  }
};

// 成本预算配置
export const COST_CONFIG = {
  // 单次请求预算(美元)
  budgetPerRequest: 0.5,
  
  // 每日预算(美元)
  dailyBudget: 10,
  
  // 预警阈值
  warningThreshold: 0.8
};

// 获取所有激活的模型配置
export function getActiveModelConfigs(): ModelConfig[] {
  return Object.values(LLM_MODELS).filter(m => m.isActive);
}

// 获取模型配置
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return LLM_MODELS[modelId];
}

// 验证配置
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查API Key
  if (!process.env.KIMI_API_KEY) {
    errors.push('缺少KIMI_API_KEY环境变量');
  }
  
  if (!process.env.QWEN_API_KEY) {
    errors.push('缺少QWEN_API_KEY环境变量');
  }
  
  // 检查Embedding服务
  if (!process.env.EMBEDDING_SERVICE_URL) {
    console.warn('未配置EMBEDDING_SERVICE_URL，使用默认http://localhost:8000');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
