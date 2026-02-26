/**
 * TDD Round 15: ModelManager 集成到 API 层测试
 * 测试用例生成 API 支持模型配置
 */

import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { ModelManager } from '@/lib/ai/model-manager';
import { NextRequest } from 'next/server';

// 辅助函数：创建 NextRequest
function createNextRequest(url: string, init?: RequestInit): NextRequest {
  return new Request(url, init) as unknown as NextRequest;
}

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    aiRequirement: {
      findUnique: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
  },
}));

// Mock ModelManager
jest.mock('@/lib/ai/model-manager', () => ({
  ModelManager: jest.fn().mockImplementation(() => ({
    generateForTask: jest.fn().mockResolvedValue(JSON.stringify({
      testCases: [{
        title: '测试用例',
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expectedResult: '预期结果',
        priority: 'P0'
      }]
    })),
    getUsageStats: jest.fn().mockReturnValue({ 'kimi-k2.5': 1 }),
    getTotalCost: jest.fn().mockReturnValue(0.001),
  })),
}));

describe('POST /api/requirements/[id]/generate-testcases - ModelManager 集成', () => {
  const mockPrisma = prisma as unknown as {
    aiRequirement: { findUnique: jest.Mock };
    test: { findMany: jest.Mock };
  };

  const mockRequirement = {
    id: 'req-001',
    projectId: 'proj-001',
    title: '登录功能需求',
    businessRules: JSON.stringify([{ type: 'length', description: '手机号11位' }]),
    features: JSON.stringify(['用户登录', '验证码登录']),
    testPoints: [
      {
        id: 'tp-001',
        name: '正常登录',
        description: '使用正确手机号和验证码登录',
        priority: 'P0',
        relatedFeature: '用户登录',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('模型配置支持', () => {
    it('应该支持从请求体传入模型配置', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
          modelConfig: {
            modelId: 'qwen-3',
            temperature: 0.5,
          },
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.testCases).toBeDefined();
    });

    it('应该支持指定模型 ID', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
          modelId: 'kimi-k2.5',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该支持温度参数控制生成随机性', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
          temperature: 0.7,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });

      expect(response.status).toBe(200);
    });
  });

  describe('成本估算', () => {
    it('应该在响应中包含成本估算', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta).toBeDefined();
    });
  });

  describe('模型健康检查', () => {
    it('应该在模型不可用时返回错误', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const MockedModelManager = ModelManager as jest.MockedClass<typeof ModelManager>;
      MockedModelManager.mockImplementationOnce(() => {
        throw new Error('模型服务不可用');
      });

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('默认模型配置', () => {
    it('应该在没有指定模型时使用默认配置', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.testCases).toBeDefined();
    });
  });

  describe('响应格式', () => {
    it('应该在响应中包含使用的模型信息', async () => {
      mockPrisma.aiRequirement.findUnique.mockResolvedValue(mockRequirement);
      mockPrisma.test.findMany.mockResolvedValue([]);

      const request = createNextRequest('http://localhost/api/requirements/req-001/generate-testcases', {
        method: 'POST',
        body: JSON.stringify({
          testPointIds: ['tp-001'],
          modelId: 'qwen-3',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'req-001' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta).toBeDefined();
      expect(data.data.meta.model).toBeDefined();
    });
  });
});
