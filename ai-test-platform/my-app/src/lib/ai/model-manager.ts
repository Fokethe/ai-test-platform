/**
 * TDD Round 13: 多模型路由管理器
 * 统一管理多个 AI 模型，根据任务类型自动选择最优模型
 */

import { generateWithAI, getAvailableModels } from './client';

// 模型配置接口
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'kimi' | 'qwen' | 'openai' | 'deepseek' | string;
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  priority?: number;
  isActive: boolean;
  // 成本配置 (元/1K tokens)
  costPer1KTokens?: {
    input: number;
    output: number;
  };
}

// 任务类型
export type TaskType = 
  | 'requirement_analysis'
  | 'testpoint_generation'
  | 'testcase_generation'
  | 'quality_check'
  | 'code_review'
  | 'document_analysis'
  | string;

// 默认任务类型到模型的映射
const DEFAULT_TASK_MAPPING: Record<TaskType, string> = {
  requirement_analysis: 'qwen-3',    // 千问 3: 推理能力强
  testpoint_generation: 'kimi-k2.5', // Kimi: 中文好，成本低
  testcase_generation: 'kimi-k2.5',  // Kimi: 生成速度快
  quality_check: 'qwen-3',           // 千问 3: 逻辑严谨
  code_review: 'qwen-3',
  document_analysis: 'kimi-k2.5',
};

// 默认模型成本配置 (元/1K tokens)
const DEFAULT_COSTS: Record<string, { input: number; output: number }> = {
  'kimi-k2.5': { input: 0.001, output: 0.002 },
  'qwen-3': { input: 0.002, output: 0.004 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'deepseek-v3': { input: 0.001, output: 0.002 },
};

export class ModelManager {
  private configs: Map<string, ModelConfig>;
  private taskMapping: Record<TaskType, string>;
  private usageStats: Map<string, number>;
  private totalCost: number;

  constructor(
    configs: ModelConfig[] = [],
    taskMapping: Record<TaskType, string> = DEFAULT_TASK_MAPPING
  ) {
    this.configs = new Map();
    this.taskMapping = { ...DEFAULT_TASK_MAPPING, ...taskMapping };
    this.usageStats = new Map();
    this.totalCost = 0;

    // 初始化配置
    configs.forEach(config => {
      this.configs.set(config.id, {
        ...config,
        priority: config.priority ?? 999,
        costPer1KTokens: config.costPer1KTokens ?? DEFAULT_COSTS[config.id] ?? { input: 0.001, output: 0.002 },
      });
    });
  }

  /**
   * 获取所有模型配置
   */
  getAllConfigs(): ModelConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 获取激活的模型配置
   */
  getActiveConfigs(): ModelConfig[] {
    return this.getAllConfigs().filter(c => c.isActive);
  }

  /**
   * 获取特定模型配置
   */
  getConfig(modelId: string): ModelConfig | undefined {
    return this.configs.get(modelId);
  }

  /**
   * 根据任务类型选择模型
   */
  selectModelForTask(taskType: TaskType): string {
    // 1. 检查任务类型映射
    const mappedModel = this.taskMapping[taskType];
    if (mappedModel) {
      const config = this.configs.get(mappedModel);
      if (config?.isActive) {
        return mappedModel;
      }
    }

    // 2. 返回优先级最高的激活模型
    const activeConfigs = this.getActiveConfigs();
    if (activeConfigs.length === 0) {
      throw new Error('没有可用的模型配置');
    }

    // 按优先级排序，返回最高优先级的
    return activeConfigs.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0].id;
  }

  /**
   * 使用指定模型生成内容
   */
  async generate(prompt: string, modelId: string): Promise<string> {
    const config = this.configs.get(modelId);
    if (!config) {
      throw new Error(`模型 ${modelId} 不存在`);
    }
    if (!config.isActive) {
      throw new Error(`模型 ${modelId} 未激活`);
    }

    // 记录调用统计
    this.usageStats.set(modelId, (this.usageStats.get(modelId) ?? 0) + 1);

    // 估算成本 (假设平均输入输出各 500 tokens)
    const estimatedTokens = 1000;
    const cost = this.estimateCost(modelId, estimatedTokens);
    this.totalCost += cost;

    // 调用 AI 生成
    const result = await generateWithAI(prompt, {
      modelId,
      config,
    });

    return result;
  }

  /**
   * 根据任务类型自动选择模型并生成
   */
  async generateForTask(prompt: string, taskType: TaskType): Promise<string> {
    const modelId = this.selectModelForTask(taskType);
    return this.generate(prompt, modelId);
  }

  /**
   * 使用 fallback 机制生成
   * 当指定模型失败时，尝试其他可用模型
   */
  async generateWithFallback(prompt: string, preferredModelId: string): Promise<string> {
    const activeConfigs = this.getActiveConfigs();
    if (activeConfigs.length === 0) {
      throw new Error('没有可用的模型');
    }

    // 优先尝试指定模型
    const tryOrder = [
      preferredModelId,
      ...activeConfigs
        .filter(c => c.id !== preferredModelId)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
        .map(c => c.id),
    ];

    const errors: string[] = [];

    for (const modelId of tryOrder) {
      try {
        return await this.generate(prompt, modelId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${modelId}: ${errorMsg}`);
        // 继续尝试下一个模型
      }
    }

    // 所有模型都失败了
    throw new Error(`所有模型不可用: ${errors.join('; ')}`);
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.usageStats.forEach((count, modelId) => {
      stats[modelId] = count;
    });
    return stats;
  }

  /**
   * 估算调用成本
   */
  estimateCost(modelId: string, tokenCount: number): number {
    const config = this.configs.get(modelId);
    if (!config?.costPer1KTokens) {
      // 默认成本
      return (tokenCount / 1000) * 0.001;
    }

    // 假设输入输出各占一半
    const inputTokens = tokenCount * 0.5;
    const outputTokens = tokenCount * 0.5;

    const inputCost = (inputTokens / 1000) * config.costPer1KTokens.input;
    const outputCost = (outputTokens / 1000) * config.costPer1KTokens.output;

    return inputCost + outputCost;
  }

  /**
   * 获取总成本
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * 健康检查 - 检查模型可用性
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    // 获取可用模型列表
    let availableModels: string[] = [];
    try {
      availableModels = await getAvailableModels();
    } catch {
      // 如果获取失败，使用本地配置检查
    }

    for (const [modelId, config] of this.configs) {
      if (!config.isActive) {
        health[modelId] = false;
        continue;
      }

      // 如果有可用模型列表，检查模型是否在列表中
      if (availableModels.length > 0) {
        health[modelId] = availableModels.includes(modelId);
        continue;
      }

      // 否则尝试一个简单的调用来检查可用性
      try {
        await generateWithAI('test', { modelId, config, timeout: 5000 });
        health[modelId] = true;
      } catch {
        health[modelId] = false;
      }
    }

    return health;
  }

  /**
   * 获取推荐模型（基于健康状态和任务类型）
   */
  async getRecommendedModel(taskType: TaskType): Promise<string> {
    const health = await this.checkHealth();
    const preferredModel = this.selectModelForTask(taskType);

    // 如果首选模型健康，直接返回
    if (health[preferredModel]) {
      return preferredModel;
    }

    // 否则返回第一个健康的模型
    const activeConfigs = this.getActiveConfigs();
    const healthyModel = activeConfigs
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
      .find(c => health[c.id]);

    if (healthyModel) {
      return healthyModel.id;
    }

    // 如果没有健康的模型，抛出错误
    throw new Error('没有可用的健康模型');
  }

  /**
   * 动态添加模型配置
   */
  addConfig(config: ModelConfig): void {
    this.configs.set(config.id, {
      ...config,
      priority: config.priority ?? 999,
      costPer1KTokens: config.costPer1KTokens ?? DEFAULT_COSTS[config.id] ?? { input: 0.001, output: 0.002 },
    });
  }

  /**
   * 更新模型配置
   */
  updateConfig(modelId: string, updates: Partial<ModelConfig>): void {
    const config = this.configs.get(modelId);
    if (!config) {
      throw new Error(`模型 ${modelId} 不存在`);
    }

    this.configs.set(modelId, {
      ...config,
      ...updates,
    });
  }

  /**
   * 禁用模型
   */
  deactivateModel(modelId: string): void {
    this.updateConfig(modelId, { isActive: false });
  }

  /**
   * 启用模型
   */
  activateModel(modelId: string): void {
    this.updateConfig(modelId, { isActive: true });
  }
}

// 导出单例实例（可选）
export const modelManager = new ModelManager([]);
