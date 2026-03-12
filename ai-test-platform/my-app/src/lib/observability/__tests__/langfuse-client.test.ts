/**
 * Langfuse 客户端测试
 * Phase 8.1: Langfuse 基础集成测试
 */

import { LangfuseClient, getConfigFromEnv, initLangfuse, getLangfuse } from '../langfuse-client';
import { ObservabilityConfig, GenerationOutput } from '../types';

// Mock Langfuse SDK
jest.mock('langfuse', () => {
  const mockSpan = {
    end: jest.fn().mockResolvedValue(undefined),
  };
  
  const mockTrace = {
    id: 'mock-trace-id',
    span: jest.fn().mockReturnValue(mockSpan),
    generation: jest.fn().mockReturnValue(mockSpan),
    event: jest.fn().mockReturnValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Langfuse: jest.fn().mockImplementation(() => ({
      trace: jest.fn().mockReturnValue(mockTrace),
      flushAsync: jest.fn().mockResolvedValue(undefined),
      shutdownAsync: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('LangfuseClient', () => {
  const mockConfig: ObservabilityConfig = {
    langfuse: {
      publicKey: 'test-public-key',
      secretKey: 'test-secret-key',
      baseUrl: 'http://localhost:3000',
      environment: 'test',
      release: '1.0.0',
      enabled: true,
    },
    costTracking: {
      modelPrices: {
        'test-model': { input: 0.001, output: 0.002 },
      },
      dailyBudget: 10,
      alertThreshold: 80,
    },
    recordIO: true,
    sensitiveFields: ['password', 'secret'],
  };

  let client: LangfuseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LangfuseClient(mockConfig);
  });

  describe('createTrace', () => {
    it('should create a trace with default id', () => {
      const result = client.createTrace('test-trace');
      
      expect(result).toHaveProperty('trace');
      expect(result).toHaveProperty('end');
      expect(typeof result.end).toBe('function');
    });

    it('should create a trace with custom context', () => {
      const context = {
        traceId: 'custom-trace-id',
        sessionId: 'session-123',
        userId: 'user-456',
        metadata: { key: 'value' },
      };
      
      const result = client.createTrace('test-trace', context);
      
      expect(result).toBeDefined();
      expect(result.trace).toBeDefined();
    });

    it('should end trace successfully', async () => {
      const result = client.createTrace('test-trace');
      
      await expect(result.end({ output: 'test' })).resolves.not.toThrow();
    });
  });

  describe('createSpan', () => {
    it('should create a span under existing trace', () => {
      const traceResult = client.createTrace('test-trace');
      // Get the mock trace id from the mock
      const traceId = 'mock-trace-id';
      
      const span = client.createSpan(traceId, {
        name: 'test-span',
        input: { data: 'test' },
      });
      
      expect(span).toHaveProperty('span');
      expect(span).toHaveProperty('end');
    });

    it('should throw error for non-existent trace', () => {
      expect(() => {
        client.createSpan('non-existent-trace', { name: 'test-span' });
      }).toThrow('Trace not found');
    });
  });

  describe('createGeneration', () => {
    it('should create a generation under existing trace', () => {
      const traceId = 'mock-trace-id';
      
      const generation = client.createGeneration(traceId, {
        name: 'test-generation',
        model: 'test-model',
        input: 'test prompt',
        modelParameters: {
          temperature: 0.7,
          maxTokens: 100,
        },
      });
      
      expect(generation).toHaveProperty('span');
      expect(generation).toHaveProperty('end');
    });

    it('should calculate cost when ending generation', async () => {
      const traceId = 'mock-trace-id';
      
      const generation = client.createGeneration(traceId, {
        name: 'test-generation',
        model: 'test-model',
        input: 'test',
      });

      const usage: GenerationOutput['usage'] = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };

      await generation.end('output', usage);
      
      // Cost should be calculated: (1000/1000)*0.001 + (500/1000)*0.002 = 0.002
      const stats = client.getCostStatistics();
      expect(stats.totalCost).toBeGreaterThan(0);
    });
  });

  describe('cost tracking', () => {
    it('should track costs across multiple generations', async () => {
      const traceId = 'mock-trace-id';

      // Create multiple generations
      for (let i = 0; i < 3; i++) {
        const gen = client.createGeneration(traceId, {
          name: `gen-${i}`,
          model: 'test-model',
          input: 'test',
        });
        
        await gen.end('output', {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
        });
      }

      const stats = client.getCostStatistics();
      expect(stats.callCount).toBe(3);
      expect(stats.byModel['test-model']).toBeDefined();
      expect(stats.byModel['test-model'].calls).toBe(3);
    });

    it('should reset cost statistics', () => {
      client.resetCostStatistics();
      
      const stats = client.getCostStatistics();
      expect(stats.totalCost).toBe(0);
      expect(stats.callCount).toBe(0);
      expect(Object.keys(stats.byModel)).toHaveLength(0);
    });

    it('should check budget status', () => {
      const budget = client.checkBudget();
      
      expect(budget).toHaveProperty('exceeded');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('usage');
      expect(typeof budget.exceeded).toBe('boolean');
    });
  });

  describe('data sanitization', () => {
    it('should sanitize sensitive fields', async () => {
      const traceId = 'mock-trace-id';
      
      const span = client.createSpan(traceId, {
        name: 'test-span',
        input: {
          username: 'test',
          password: 'secret123',
          secret: 'my-secret',
        },
      });

      await expect(span.end()).resolves.not.toThrow();
    });
  });

  describe('client lifecycle', () => {
    it('should flush data successfully', async () => {
      await expect(client.flushAsync()).resolves.not.toThrow();
    });

    it('should shutdown successfully', async () => {
      await expect(client.shutdownAsync()).resolves.not.toThrow();
    });
  });
});

describe('getConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return null when env vars are missing', () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_BASE_URL;

    const config = getConfigFromEnv();
    expect(config).toBeNull();
  });

  it('should return config when all env vars are set', () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'test-public';
    process.env.LANGFUSE_SECRET_KEY = 'test-secret';
    process.env.LANGFUSE_BASE_URL = 'http://localhost:3000';
    process.env.LANGFUSE_DAILY_BUDGET = '10';
    process.env.LANGFUSE_ENABLED = 'true';

    const config = getConfigFromEnv();
    
    expect(config).not.toBeNull();
    expect(config?.langfuse.publicKey).toBe('test-public');
    expect(config?.langfuse.secretKey).toBe('test-secret');
    expect(config?.langfuse.baseUrl).toBe('http://localhost:3000');
    expect(config?.costTracking?.dailyBudget).toBe(10);
  });
});

describe('global client', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      require('../langfuse-client');
    });
  });

  it('should initialize and get global client', () => {
    const config: ObservabilityConfig = {
      langfuse: {
        publicKey: 'test',
        secretKey: 'test',
        baseUrl: 'http://localhost',
        enabled: true,
      },
    };

    const client1 = initLangfuse(config);
    const client2 = getLangfuse();

    expect(client1).toBe(client2);
  });
});
