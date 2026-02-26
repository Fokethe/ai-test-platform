/**
 * TDD Round 13: 多模型路由管理器测试
 * 目标: 实现统一的模型管理，根据任务类型选择最优模型
 */

import { ModelManager, ModelConfig, TaskType } from '../model-manager';

// 模拟 AI 客户端
jest.mock('../client', () => ({
  generateWithAI: jest.fn(),
  getAvailableModels: jest.fn(),
}));

import { generateWithAI, getAvailableModels } from '../client';

const mockedGenerateWithAI = generateWithAI as jest.MockedFunction<typeof generateWithAI>;
const mockedGetAvailableModels = getAvailableModels as jest.MockedFunction<typeof getAvailableModels>;

describe('TDD Round 13: ModelManager 多模型路由', () => {
  let modelManager: ModelManager;

  const mockConfigs: ModelConfig[] = [
    {
      id: 'kimi-k2.5',
      name: 'Kimi K2.5',
      provider: 'kimi',
      apiKey: 'test-key-1',
      baseUrl: 'https://api.kimi.com',
      models: ['kimi-k2.5'],
      priority: 1,
      isActive: true,
    },
    {
      id: 'qwen-3',
      name: 'Qwen 3',
      provider: 'qwen',
      apiKey: 'test-key-2',
      baseUrl: 'https://api.qwen.com',
      models: ['qwen-3'],
      priority: 2,
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    modelManager = new ModelManager(mockConfigs);
  });

  describe('模型配置管理', () => {
    it('应该初始化时加载所有模型配置', () => {
      const configs = modelManager.getAllConfigs();
      expect(configs).toHaveLength(2);
      expect(configs[0].id).toBe('kimi-k2.5');
      expect(configs[1].id).toBe('qwen-3');
    });

    it('应该根据ID获取特定模型配置', () => {
      const config = modelManager.getConfig('kimi-k2.5');
      expect(config).toBeDefined();
      expect(config?.name).toBe('Kimi K2.5');
      expect(config?.provider).toBe('kimi');
    });

    it('应该返回 undefined 当配置不存在时', () => {
      const config = modelManager.getConfig('non-existent');
      expect(config).toBeUndefined();
    });

    it('应该只返回激活的模型配置', () => {
      const inactiveConfig: ModelConfig = {
        id: 'inactive-model',
        name: 'Inactive',
        provider: 'test',
        apiKey: 'key',
        isActive: false,
      };
      const manager = new ModelManager([...mockConfigs, inactiveConfig]);
      const activeConfigs = manager.getActiveConfigs();
      
      expect(activeConfigs).toHaveLength(2);
      expect(activeConfigs.every(c => c.isActive)).toBe(true);
    });
  });

  describe('任务类型与模型映射', () => {
    it('应该为需求分析任务选择千问 3', () => {
      const modelId = modelManager.selectModelForTask('requirement_analysis');
      expect(modelId).toBe('qwen-3');
    });

    it('应该为测试点生成任务选择 Kimi k2.5', () => {
      const modelId = modelManager.selectModelForTask('testpoint_generation');
      expect(modelId).toBe('kimi-k2.5');
    });

    it('应该为用例生成任务选择 Kimi k2.5', () => {
      const modelId = modelManager.selectModelForTask('testcase_generation');
      expect(modelId).toBe('kimi-k2.5');
    });

    it('应该为质量检查任务选择千问 3', () => {
      const modelId = modelManager.selectModelForTask('quality_check');
      expect(modelId).toBe('qwen-3');
    });

    it('应该支持自定义任务类型映射', () => {
      const customMapping = {
        custom_task: 'qwen-3' as const,
      };
      const manager = new ModelManager(mockConfigs, customMapping);
      const modelId = manager.selectModelForTask('custom_task' as TaskType);
      expect(modelId).toBe('qwen-3');
    });

    it('当任务类型未映射时应该返回默认模型', () => {
      const modelId = modelManager.selectModelForTask('unknown_task' as TaskType);
      // 默认选择优先级最高的激活模型
      expect(modelId).toBe('kimi-k2.5');
    });
  });

  describe('模型调用', () => {
    it('应该使用指定模型生成内容', async () => {
      mockedGenerateWithAI.mockResolvedValue('生成结果');

      const result = await modelManager.generate('测试提示词', 'kimi-k2.5');

      expect(result).toBe('生成结果');
      expect(mockedGenerateWithAI).toHaveBeenCalledWith(
        '测试提示词',
        expect.objectContaining({
          modelId: 'kimi-k2.5',
          config: expect.any(Object),
        })
      );
    });

    it('应该根据任务类型自动选择模型并生成', async () => {
      mockedGenerateWithAI.mockResolvedValue('用例生成结果');

      const result = await modelManager.generateForTask(
        '生成测试用例',
        'testcase_generation'
      );

      expect(result).toBe('用例生成结果');
      // 验证选择了正确的模型 (kimi-k2.5)
      expect(mockedGenerateWithAI).toHaveBeenCalledWith(
        '生成测试用例',
        expect.objectContaining({
          modelId: 'kimi-k2.5',
        })
      );
    });

    it('当指定模型不可用时应该使用 fallback 模型', async () => {
      // 模拟指定模型失败
      mockedGenerateWithAI
        .mockRejectedValueOnce(new Error('模型不可用'))
        .mockResolvedValueOnce('fallback 结果');

      const result = await modelManager.generateWithFallback('测试', 'qwen-3');

      expect(result).toBe('fallback 结果');
      // 验证尝试了两次
      expect(mockedGenerateWithAI).toHaveBeenCalledTimes(2);
    });

    it('当所有模型都失败时应该抛出错误', async () => {
      mockedGenerateWithAI.mockRejectedValue(new Error('所有模型不可用'));

      await expect(modelManager.generateWithFallback('测试', 'kimi-k2.5'))
        .rejects.toThrow('所有模型不可用');
    });
  });

  describe('Token 统计与成本追踪', () => {
    it('应该记录模型调用次数', async () => {
      mockedGenerateWithAI.mockResolvedValue('结果');

      await modelManager.generate('测试1', 'kimi-k2.5');
      await modelManager.generate('测试2', 'kimi-k2.5');
      await modelManager.generate('测试3', 'qwen-3');

      const stats = modelManager.getUsageStats();
      expect(stats['kimi-k2.5']).toBe(2);
      expect(stats['qwen-3']).toBe(1);
    });

    it('应该估算调用成本', () => {
      const cost = modelManager.estimateCost('kimi-k2.5', 1000);
      // Kimi k2.5 假设成本: 0.001元/1K tokens
      expect(cost).toBeGreaterThan(0);
    });

    it('应该为不同模型返回不同成本估算', () => {
      const kimiCost = modelManager.estimateCost('kimi-k2.5', 1000);
      const qwenCost = modelManager.estimateCost('qwen-3', 1000);
      
      // 不同模型应该有不同的成本
      expect(kimiCost).not.toBe(qwenCost);
    });

    it('应该追踪总成本', async () => {
      mockedGenerateWithAI.mockResolvedValue('结果');

      await modelManager.generate('测试', 'kimi-k2.5');
      
      const totalCost = modelManager.getTotalCost();
      expect(totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('健康检查', () => {
    it('应该检查模型可用性', async () => {
      mockedGetAvailableModels.mockResolvedValue(['kimi-k2.5', 'qwen-3']);

      const health = await modelManager.checkHealth();

      expect(health['kimi-k2.5']).toBe(true);
      expect(health['qwen-3']).toBe(true);
    });

    it('应该标记不可用的模型', async () => {
      mockedGetAvailableModels.mockResolvedValue(['kimi-k2.5']); // qwen-3 不可用

      const health = await modelManager.checkHealth();

      expect(health['kimi-k2.5']).toBe(true);
      expect(health['qwen-3']).toBe(false);
    });

    it('应该获取推荐模型（基于健康状态和优先级）', async () => {
      mockedGetAvailableModels.mockResolvedValue(['kimi-k2.5']);

      const recommended = await modelManager.getRecommendedModel('testcase_generation');

      // 虽然 testcase_generation 默认映射到 kimi-k2.5，但应该返回可用的模型
      expect(recommended).toBe('kimi-k2.5');
    });
  });

  describe('动态配置更新', () => {
    it('应该支持动态添加模型配置', () => {
      const newConfig: ModelConfig = {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        apiKey: 'new-key',
        isActive: true,
      };

      modelManager.addConfig(newConfig);

      expect(modelManager.getConfig('gpt-4')).toBeDefined();
      expect(modelManager.getAllConfigs()).toHaveLength(3);
    });

    it('应该支持更新现有配置', () => {
      modelManager.updateConfig('kimi-k2.5', { priority: 10 });

      const config = modelManager.getConfig('kimi-k2.5');
      expect(config?.priority).toBe(10);
    });

    it('应该支持禁用模型', () => {
      modelManager.deactivateModel('qwen-3');

      const config = modelManager.getConfig('qwen-3');
      expect(config?.isActive).toBe(false);
    });
  });
});
