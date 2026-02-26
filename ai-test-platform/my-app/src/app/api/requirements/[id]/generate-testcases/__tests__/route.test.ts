/**
 * TDD Round 7: 用例生成 API 测试
 * 目标: 实现用例生成的 API 端点
 */

import { POST } from '../route';
import { prisma } from '@/lib/prisma';

// 模拟 AI 客户端
jest.mock('@/lib/ai/client', () => ({
  generateWithAI: jest.fn(),
}));

import { generateWithAI } from '@/lib/ai/client';

const mockedGenerateWithAI = generateWithAI as jest.MockedFunction<typeof generateWithAI>;

describe('POST /api/requirements/[id]/generate-testcases', () => {
  let mockRequirement: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // 创建测试数据
    mockRequirement = await prisma.aiRequirement.create({
      data: {
        title: '用户登录需求',
        type: 'txt',
        filename: 'login.txt',
        content: '用户登录功能需求...',
        rawText: '用户登录功能需求...',
        size: 100,
        features: JSON.stringify(['手机号+验证码登录', '密码登录']),
        businessRules: JSON.stringify([
          { type: 'format', description: '手机号必须为11位' },
        ]),
        projectId: 'test-project',
        testPoints: {
          create: [
            {
              name: '正确手机号登录',
              description: '使用正确手机号和验证码登录',
              priority: 'P0',
              relatedFeature: '手机号+验证码登录',
            },
            {
              name: '错误手机号处理',
              description: '输入错误格式手机号的处理',
              priority: 'P1',
              relatedFeature: '手机号+验证码登录',
            },
          ],
        },
      },
      include: {
        testPoints: true,
      },
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.aiRequirement.deleteMany({
      where: { projectId: 'test-project' },
    });
  });

  describe('基础功能', () => {
    it('应该成功生成用例', async () => {
      const mockAIResponse = {
        testCases: [
          {
            title: '验证正确手机号登录成功',
            precondition: '用户已注册',
            steps: ['输入正确手机号', '输入正确验证码', '点击登录'],
            expectedResult: '登录成功，跳转到首页',
            priority: 'P0',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockAIResponse));

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [mockRequirement.testPoints[0].id],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.code).toBe(0);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('验证正确手机号登录成功');
    });

    it('应该支持批量生成多个测试点的用例', async () => {
      const mockResponse1 = {
        testCases: [
          {
            title: '正确登录用例',
            precondition: '',
            steps: ['步骤1'],
            expectedResult: '成功',
            priority: 'P0',
          },
        ],
      };

      const mockResponse2 = {
        testCases: [
          {
            title: '错误处理用例',
            precondition: '',
            steps: ['步骤1'],
            expectedResult: '提示错误',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI
        .mockResolvedValueOnce(JSON.stringify(mockResponse1))
        .mockResolvedValueOnce(JSON.stringify(mockResponse2));

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: mockRequirement.testPoints.map((tp: any) => tp.id),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.code).toBe(0);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('参数验证', () => {
    it('应该验证需求ID存在', async () => {
      const request = new Request('http://localhost:3000/api/requirements/non-existent/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: ['tp-1'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.code).toBe(404);
      expect(result.error.message).toContain('需求不存在');
    });

    it('应该验证测试点ID列表不为空', async () => {
      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe(400);
      expect(result.error.message).toContain('测试点ID列表不能为空');
    });

    it('应该验证测试点属于该需求', async () => {
      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: ['non-existent-testpoint'],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe(400);
      expect(result.error.message).toContain('测试点不存在');
    });
  });

  describe('生成的用例数据', () => {
    it('生成的用例应该关联到正确的测试点', async () => {
      const mockAIResponse = {
        testCases: [
          {
            title: '测试用例',
            precondition: '',
            steps: ['步骤1'],
            expectedResult: '结果',
            priority: 'P0',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockAIResponse));

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [mockRequirement.testPoints[0].id],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(result.data[0].testPointId).toBe(mockRequirement.testPoints[0].id);
    });

    it('生成的用例应该包含完整字段', async () => {
      const mockAIResponse = {
        testCases: [
          {
            title: '完整用例',
            precondition: '前置条件',
            steps: ['步骤1', '步骤2'],
            expectedResult: '预期结果',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockResolvedValueOnce(JSON.stringify(mockAIResponse));

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [mockRequirement.testPoints[0].id],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(result.data[0]).toMatchObject({
        id: expect.any(String),
        title: '完整用例',
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expectedResult: '预期结果',
        priority: 'P1',
        testPointId: expect.any(String),
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理 AI 生成失败', async () => {
      mockedGenerateWithAI.mockRejectedValueOnce(new Error('AI 服务不可用'));

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [mockRequirement.testPoints[0].id],
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.code).toBe(500);
      expect(result.error.message).toContain('生成失败');
    });

    it('应该处理无效的请求体', async () => {
      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe(400);
    });
  });

  describe('业务规则上下文', () => {
    it('应该将需求的业务规则传递给生成器', async () => {
      const mockAIResponse = {
        testCases: [
          {
            title: '考虑业务规则的用例',
            precondition: '',
            steps: ['步骤1'],
            expectedResult: '结果',
            priority: 'P1',
          },
        ],
      };

      mockedGenerateWithAI.mockImplementation(async (prompt: string) => {
        // 验证提示词中包含业务规则
        expect(prompt).toContain('手机号必须为11位');
        return JSON.stringify(mockAIResponse);
      });

      const request = new Request('http://localhost:3000/api/requirements/test/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPointIds: [mockRequirement.testPoints[0].id],
        }),
      });

      await POST(request, { params: Promise.resolve({ id: mockRequirement.id }) });
    });
  });
});
