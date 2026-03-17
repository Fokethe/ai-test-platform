/**
 * LangChain 客户端封装
 * TDD Round 1: LangChain 客户端封装
 * 
 * 提供统一的 AI 调用接口，支持多模型、流式输出、自动重试、Token 统计
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage as LangChainAIMessage } from '@langchain/core/messages';
import {
  AIProvider,
  LangChainClientConfig,
  TokenUsage,
  GenerateResponse,
  GenerateOptions,
  StreamCallbacks,
  RetryConfig,
  PROVIDER_CONFIGS,
  MODEL_COSTS,
} from './types';

export class LangChainClient {
  private config: Required<LangChainClientConfig>;
  private model: ChatOpenAI;
  private tokenUsage: TokenUsage;
  private retryConfig: RetryConfig;

  constructor(config: LangChainClientConfig) {
    this.config = this.mergeWithDefaults(config);
    this.model = this.createModel();
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
    this.retryConfig = {
      maxRetries: this.config.maxRetries,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };
  }

  /**
   * 合并配置与默认值
   */
  private mergeWithDefaults(config: LangChainClientConfig): Required<LangChainClientConfig> {
    const providerConfig = PROVIDER_CONFIGS[config.provider];
    
    // 严格检查 API Key
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error(`未配置 ${config.provider} 的 API Key，请设置环境变量或传入 apiKey 参数`);
    }
    
    return {
      provider: config.provider,
      apiKey,
      baseUrl: config.baseUrl || providerConfig.baseUrl,
      model: config.model || providerConfig.defaultModel,
      temperature: config.temperature ?? 0.3,
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * 创建 LangChain 模型实例
   */
  private createModel(): ChatOpenAI {
    return new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: this.config.apiKey,
      configuration: {
        baseURL: this.config.baseUrl,
      },
      timeout: this.config.timeout,
      maxRetries: 0, // 我们自定义重试逻辑
    });
  }

  /**
   * 生成文本（非流式）
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    const messages = [
      new SystemMessage('你是一位专业的AI助手，请提供准确、有用的回答。'),
      new HumanMessage(prompt),
    ];

    const execute = async (): Promise<GenerateResponse> => {
      const response = await this.model.invoke(messages, {
        temperature: options?.temperature ?? this.config.temperature,
      } as any);

      const content = response.content.toString();
      const usage = this.extractUsage(response);
      this.accumulateUsage(usage);

      return {
        content,
        usage: this.getTokenUsage(),
        model: this.config.model,
        provider: this.config.provider,
      };
    };

    return this.withRetry(execute);
  }

  /**
   * 生成文本（流式）
   */
  async generateStream(prompt: string, callbacks: StreamCallbacks, options?: GenerateOptions): Promise<void> {
    const messages = [
      new SystemMessage('你是一位专业的AI助手，请提供准确、有用的回答。'),
      new HumanMessage(prompt),
    ];

    try {
      const stream = await this.model.stream(messages, {
        temperature: options?.temperature ?? this.config.temperature,
      } as any);

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        const content = chunk.content.toString();
        fullContent += content;
        completionTokens += this.estimateTokenCount(content);
        
        callbacks.onToken?.(content);
      }

      promptTokens = this.estimateTokenCount(prompt);
      const usage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost: this.calculateCost(promptTokens, completionTokens),
      };
      this.accumulateUsage(usage);

      callbacks.onComplete?.({
        content: fullContent,
        usage: this.getTokenUsage(),
        model: this.config.model,
        provider: this.config.provider,
      });
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 多轮对话生成
   */
  async generateWithHistory(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: GenerateOptions
  ): Promise<GenerateResponse> {
    const langChainMessages = messages.map((msg) => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new LangChainAIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });

    const execute = async (): Promise<GenerateResponse> => {
      const response = await this.model.invoke(langChainMessages, {
        temperature: options?.temperature ?? this.config.temperature,
      } as any);

      const content = response.content.toString();
      const usage = this.extractUsage(response);
      this.accumulateUsage(usage);

      return {
        content,
        usage: this.getTokenUsage(),
        model: this.config.model,
        provider: this.config.provider,
      };
    };

    return this.withRetry(execute);
  }

  /**
   * 带重试的执行
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.retryDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryConfig.maxRetries) {
          await this.sleep(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    throw lastError;
  }

  /**
   * 提取 Token 使用量
   */
  private extractUsage(response: any): TokenUsage {
    // LangChain 可能不会直接返回 usage，需要估算
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: this.calculateCost(promptTokens, completionTokens),
    };
  }

  /**
   * 估算 Token 数量（简化版：1 token ≈ 4 字符）
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算成本
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const costs = MODEL_COSTS[this.config.model] || { input: 0.001, output: 0.002 };
    const inputCost = (promptTokens / 1000) * costs.input;
    const outputCost = (completionTokens / 1000) * costs.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * 累积 Token 使用量
   */
  private accumulateUsage(usage: TokenUsage): void {
    this.tokenUsage.promptTokens += usage.promptTokens;
    this.tokenUsage.completionTokens += usage.completionTokens;
    this.tokenUsage.totalTokens += usage.totalTokens;
    this.tokenUsage.estimatedCost += usage.estimatedCost;
  }

  /**
   * 获取 Token 使用统计
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * 重置 Token 统计
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): LangChainClientConfig {
    return { ...this.config };
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default LangChainClient;
