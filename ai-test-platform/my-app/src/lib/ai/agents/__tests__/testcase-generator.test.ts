/**
 * TDD Round 6: TestCaseGenerator Agent 测试
 * 目标: 基于测试点生成详细测试用例
 */

import { TestCaseGenerator, GeneratedTestCase } from '../testcase-generator';

// 模拟 AI 客户端
jest.mock('../../client', () => ({
  generateWithAI: jest.fn(),
}));

import { generateWithAI } from '../../client';

const mockedGenerateWithAI = generateWithAI as jest.MockedFunction<typeof generateWithAI>;

describe('TestCaseGenerator', () => {
  let generator: TestCaseGenerator;

  beforeEach(() => {
    generator = new TestCaseGenerator();
    jest.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该成功实例化', () => {
      expect(generator).toBeInstanceOf(TestCaseGenerator);
    });

    it('应该生成单个测试点的用例', async () => {
      const mockResponse = {
        testCases: [
          {
            title: '验证手机号格式正确性',
            precondition: '用户已打开登录页面',
            steps: [
              '输入正确的手机号：13800138000',
              '点击获取验证码按钮',
            ],
            expectedResult: '验证码发送成功，提示"验证码已发送"',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const testPoint = {
        id: 'TP-001',
        name: '手机号格式验证',
        description: '验证手机号输入框对正确格式的处理',
        priority: 'P1' as const,
        relatedFeature: '用户登录',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('验证手机号格式正确性');
      expect(result[0].steps).toHaveLength(2);
      expect(result[0].expectedResult).toBeDefined();
    });

    it('应该生成多个测试点的用例', async () => {
      const mockResponse1 = {
        testCases: [
          {
            title: '验证正确手机号登录',
            precondition: '用户已注册',
            steps: ['输入正确手机号', '输入正确验证码', '点击登录'],
            expectedResult: '登录成功，跳转到首页',
            priority: 'P0',
          },
        ],
      };

      const mockResponse2 = {
        testCases: [
          {
            title: '验证错误手机号提示',
            precondition: '用户已打开登录页',
            steps: ['输入错误手机号格式', '点击获取验证码'],
            expectedResult: '提示"手机号格式不正确"',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI
        .mockResolvedValueOnce(JSON.stringify(mockResponse1))
        .mockResolvedValueOnce(JSON.stringify(mockResponse2));

      const testPoints = [
        {
          id: 'TP-001',
          name: '正确手机号登录',
          description: '使用正确手机号和验证码登录',
          priority: 'P0' as const,
          relatedFeature: '用户登录',
        },
        {
          id: 'TP-002',
          name: '错误手机号处理',
          description: '输入错误格式手机号的处理',
          priority: 'P1' as const,
          relatedFeature: '用户登录',
        },
      ];

      const result = await generator.generateFromTestPoints(testPoints);

      expect(result).toHaveLength(2);
      expect(result[0].testPointId).toBe('TP-001');
      expect(result[1].testPointId).toBe('TP-002');
    });
  });

  describe('用例结构验证', () => {
    it('生成的用例应该包含所有必要字段', async () => {
      const mockResponse = {
        testCases: [
          {
            title: '测试用例标题',
            precondition: '前置条件',
            steps: ['步骤1', '步骤2'],
            expectedResult: '预期结果',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const testPoint = {
        id: 'TP-001',
        name: '测试点名称',
        description: '测试点描述',
        priority: 'P1' as const,
        relatedFeature: '功能模块',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        precondition: expect.any(String),
        steps: expect.any(Array),
        expectedResult: expect.any(String),
        priority: expect.any(String),
        testPointId: 'TP-001',
        relatedFeature: '功能模块',
      });
    });

    it('步骤应该是字符串数组', async () => {
      const mockResponse = {
        testCases: [
          {
            title: '测试用例',
            precondition: '前置条件',
            steps: ['步骤1', '步骤2', '步骤3'],
            expectedResult: '预期结果',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const testPoint = {
        id: 'TP-001',
        name: '测试点',
        description: '描述',
        priority: 'P1' as const,
        relatedFeature: '功能',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(Array.isArray(result[0].steps)).toBe(true);
      result[0].steps.forEach((step: string) => {
        expect(typeof step).toBe('string');
      });
    });
  });

  describe('优先级处理', () => {
    it('应该保留测试点的优先级', async () => {
      const mockResponse = {
        testCases: [
          {
            title: 'P0级别用例',
            precondition: '前置条件',
            steps: ['步骤1'],
            expectedResult: '预期结果',
            priority: 'P0',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const testPoint = {
        id: 'TP-001',
        name: '核心功能测试',
        description: '描述',
        priority: 'P0' as const,
        relatedFeature: '登录',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(result[0].priority).toBe('P0');
    });

    it('应该为单个测试点生成多条用例（正例+反例）', async () => {
      const mockResponse = {
        testCases: [
          {
            title: '正确输入登录成功',
            precondition: '用户已注册',
            steps: ['输入正确手机号', '输入正确验证码', '点击登录'],
            expectedResult: '登录成功',
            priority: 'P0',
          },
          {
            title: '错误验证码登录失败',
            precondition: '用户已注册',
            steps: ['输入正确手机号', '输入错误验证码', '点击登录'],
            expectedResult: '提示"验证码错误"',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const testPoint = {
        id: 'TP-001',
        name: '登录功能测试',
        description: '验证登录功能的各种场景',
        priority: 'P0' as const,
        relatedFeature: '用户登录',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(result).toHaveLength(2);
      expect(result[0].title).toContain('正确');
      expect(result[1].title).toContain('错误');
    });
  });

  describe('错误处理', () => {
    it('应该处理 AI 生成失败的情况', async () => {
      mockedGenerateWithAI.mockRejectedValueOnce(new Error('AI 服务不可用'));

      const testPoint = {
        id: 'TP-001',
        name: '测试点',
        description: '描述',
        priority: 'P1' as const,
        relatedFeature: '功能',
      };

      await expect(generator.generateFromTestPoint(testPoint)).rejects.toThrow('用例生成失败');
    });

    it('应该处理 AI 返回无效 JSON 的情况', async () => {
      mockedGenerateWithAI.mockResolvedValueOnce('无效的 JSON 响应');

      const testPoint = {
        id: 'TP-001',
        name: '测试点',
        description: '描述',
        priority: 'P1' as const,
        relatedFeature: '功能',
      };

      await expect(generator.generateFromTestPoint(testPoint)).rejects.toThrow('解析生成结果失败');
    });

    it('应该处理 AI 返回空用例列表的情况', async () => {
      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify({ testCases: [] }));

      const testPoint = {
        id: 'TP-001',
        name: '测试点',
        description: '描述',
        priority: 'P1' as const,
        relatedFeature: '功能',
      };

      const result = await generator.generateFromTestPoint(testPoint);

      expect(result).toHaveLength(0);
    });
  });

  describe('提示词构建', () => {
    it('应该在提示词中包含测试点信息', async () => {
      mockedGenerateWithAI.mockImplementation(async (prompt: string) => {
        // 验证提示词包含测试点信息
        expect(prompt).toContain('测试点名称');
        expect(prompt).toContain('测试点描述');
        return JSON.stringify({
          testCases: [{ title: '用例', precondition: '', steps: [], expectedResult: '', priority: 'P1' }],
        });
      });

      const testPoint = {
        id: 'TP-001',
        name: '测试点名称',
        description: '测试点描述',
        priority: 'P1' as const,
        relatedFeature: '功能模块',
      };

      await generator.generateFromTestPoint(testPoint);
    });

    it('应该在提示词中包含业务规则上下文', async () => {
      mockedGenerateWithAI.mockImplementation(async (prompt: string) => {
        expect(prompt).toContain('手机号必须为11位');
        expect(prompt).toContain('验证码有效期5分钟');
        return JSON.stringify({
          testCases: [{ title: '用例', precondition: '', steps: [], expectedResult: '', priority: 'P1' }],
        });
      });

      const testPoint = {
        id: 'TP-001',
        name: '登录测试',
        description: '验证登录功能',
        priority: 'P1' as const,
        relatedFeature: '用户登录',
      };

      const context = {
        businessRules: [
          { type: 'format', description: '手机号必须为11位' },
          { type: 'timeout', description: '验证码有效期5分钟' },
        ],
      };

      await generator.generateFromTestPoint(testPoint, context);
    });
  });

  describe('批量生成优化', () => {
    it('应该支持批量生成时控制并发数', async () => {
      const mockResponse = {
        testCases: [
          {
            title: '用例',
            precondition: '',
            steps: ['步骤1'],
            expectedResult: '结果',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValue(JSON.stringify(mockResponse));

      const testPoints = Array.from({ length: 5 }, (_, i) => ({
        id: `TP-${i + 1}`,
        name: `测试点${i + 1}`,
        description: `描述${i + 1}`,
        priority: 'P1' as const,
        relatedFeature: '功能',
      }));

      await generator.generateFromTestPoints(testPoints, { concurrency: 2 });

      // 验证 AI 被调用了 5 次（每个测试点一次）
      expect(mockedGenerateWithAI).toHaveBeenCalledTimes(5);
    });

    it('应该支持批量生成时返回进度', async () => {
      const mockResponse = {
        testCases: [{ title: '用例', precondition: '', steps: [], expectedResult: '', priority: 'P1' }],
      };

      mockedGenerateWithAI.mockResolvedValue(JSON.stringify(mockResponse));

      const testPoints = [
        { id: 'TP-1', name: '测试点1', description: '描述1', priority: 'P1' as const, relatedFeature: '功能' },
        { id: 'TP-2', name: '测试点2', description: '描述2', priority: 'P1' as const, relatedFeature: '功能' },
      ];

      const progressCallback = jest.fn();

      await generator.generateFromTestPoints(testPoints, { onProgress: progressCallback });

      // 验证进度回调被调用
      expect(progressCallback).toHaveBeenCalled();
    });
  });
});
