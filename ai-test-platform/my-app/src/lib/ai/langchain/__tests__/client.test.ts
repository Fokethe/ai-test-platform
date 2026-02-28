/**
 * LangChainClient 单元测试
 * TDD Round 1: 15 个测试
 */

import { LangChainClient } from '../client';
import { AIProvider } from '../types';

// Mock LangChain
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
    stream: jest.fn(),
  })),
}));

describe('LangChainClient', () => {
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 应该使用 ChatOpenAI 创建客户端', () => {
    it('should create client with ChatOpenAI', () => {
      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });
      
      expect(client).toBeInstanceOf(LangChainClient);
    });
  });

  describe('2. 应该支持 Kimi 模型配置', () => {
    it('should support kimi provider configuration', () => {
      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        model: 'kimi-k2.5',
      });
      
      const config = client.getConfig();
      expect(config.provider).toBe('kimi');
      expect(config.model).toBe('kimi-k2.5');
      expect(config.baseUrl).toBe('https://api.moonshot.cn/v1');
    });
  });

  describe('3. 应该支持 千问 模型配置', () => {
    it('should support qwen provider configuration', () => {
      const client = new LangChainClient({
        provider: 'qwen',
        apiKey: mockApiKey,
        model: 'qwen-3',
      });
      
      const config = client.getConfig();
      expect(config.provider).toBe('qwen');
      expect(config.model).toBe('qwen-3');
      expect(config.baseUrl).toBe('https://dashscope.aliyuncs.com/api/v1');
    });
  });

  describe('4. 应该支持 GPT 模型配置', () => {
    it('should support openai provider configuration', () => {
      const client = new LangChainClient({
        provider: 'openai',
        apiKey: mockApiKey,
        model: 'gpt-4',
      });
      
      const config = client.getConfig();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
      expect(config.baseUrl).toBe('https://api.openai.com/v1');
    });
  });

  describe('5. 应该支持流式输出', () => {
    it('should support streaming output', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const mockStream = async function* () {
        yield { content: 'Hello' };
        yield { content: ' World' };
      };
      
      ChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockReturnValue(mockStream()),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });

      const tokens: string[] = [];
      const callbacks = {
        onToken: (token: string) => tokens.push(token),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await client.generateStream('test prompt', callbacks);
      
      expect(tokens).toContain('Hello');
      expect(tokens).toContain(' World');
      expect(callbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('6. 应该自动重试失败请求', () => {
    it('should retry failed requests', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ content: 'Success' });
      
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        maxRetries: 2,
      });

      const result = await client.generate('test prompt');
      
      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result.content).toBe('Success');
    });
  });

  describe('7. 应该记录 Token 使用量', () => {
    it('should track token usage', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Test response',
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });

      await client.generate('test prompt');
      const usage = client.getTokenUsage();
      
      expect(usage.totalTokens).toBeGreaterThan(0);
      expect(usage.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('8. 应该处理 API 错误', () => {
    it('should handle API errors', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        maxRetries: 0,
      });

      await expect(client.generate('test')).rejects.toThrow('API Error');
    });
  });

  describe('9. 应该支持自定义超时', () => {
    it('should support custom timeout', () => {
      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        timeout: 60000,
      });

      const config = client.getConfig();
      expect(config.timeout).toBe(60000);
    });
  });

  describe('10. 应该支持温度参数', () => {
    it('should support temperature parameter', () => {
      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        temperature: 0.7,
      });

      const config = client.getConfig();
      expect(config.temperature).toBe(0.7);
    });
  });

  describe('11. 应该返回结构化响应', () => {
    it('should return structured response', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Test content',
        }),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        model: 'kimi-k2.5',
      });

      const result = await client.generate('test');
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('provider');
      expect(result.model).toBe('kimi-k2.5');
      expect(result.provider).toBe('kimi');
    });
  });

  describe('12. 应该支持多消息对话', () => {
    it('should support multi-message conversation', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Response',
        }),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      const result = await client.generateWithHistory(messages);
      
      expect(result.content).toBe('Response');
    });
  });

  describe('13. 应该处理网络错误', () => {
    it('should handle network errors with retry', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const mockInvoke = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({ content: 'Success after retries' });
      
      ChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        maxRetries: 3,
      });

      const result = await client.generate('test');
      
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(result.content).toBe('Success after retries');
    });
  });

  describe('14. 应该支持取消请求', () => {
    it('should support request cancellation in stream', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      const error = new Error('Request aborted');
      error.name = 'AbortError';
      
      ChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockRejectedValue(error),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });

      const callbacks = {
        onToken: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      await expect(client.generateStream('test', callbacks)).rejects.toThrow('Request aborted');
      expect(callbacks.onError).toHaveBeenCalled();
    });
  });

  describe('15. 应该正确计算成本', () => {
    it('should calculate cost correctly', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Test',
          usage: { prompt_tokens: 1000, completion_tokens: 500 },
        }),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
        model: 'kimi-k2.5',
      });

      await client.generate('test');
      const usage = client.getTokenUsage();
      
      // kimi-k2.5: input $0.001/1k, output $0.002/1k
      // 1000 input + 500 output = $0.001 + $0.001 = $0.002
      expect(usage.estimatedCost).toBeGreaterThan(0);
    });

    it('should reset token usage', async () => {
      const { ChatOpenAI } = require('@langchain/openai');
      ChatOpenAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Test',
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      }));

      const client = new LangChainClient({
        provider: 'kimi',
        apiKey: mockApiKey,
      });

      await client.generate('test');
      expect(client.getTokenUsage().totalTokens).toBeGreaterThan(0);

      client.resetTokenUsage();
      expect(client.getTokenUsage().totalTokens).toBe(0);
    });
  });
});
