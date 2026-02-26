/**
 * TestCaseGenerator + RAG 集成测试
 * 测试用例生成器集成知识库检索功能
 * TDD Round 11
 * TDD Round 14 更新: 使用 ModelManager 集成
 */

import { TestCaseGenerator, TestPoint, GenerationContext } from '../testcase-generator'
import { retrieveSimilarTestCases } from '../../rag/retrieval'
import { ModelManager } from '../../model-manager'

// Mock RAG 检索模块
jest.mock('../../rag/retrieval', () => ({
  retrieveSimilarTestCases: jest.fn(),
}))

// Mock ModelManager
jest.mock('../../model-manager')

describe('TestCaseGenerator + RAG 集成', () => {
  let generator: TestCaseGenerator
  let mockModelManager: jest.Mocked<ModelManager>
  const mockRetrieveSimilarTestCases = retrieveSimilarTestCases as jest.MockedFunction<typeof retrieveSimilarTestCases>

  const mockHistoricalCases = [
    {
      id: 'hist-001',
      title: '有效用户名和密码登录成功',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入有效密码', '点击登录按钮'],
      expectedResult: '登录成功，跳转到首页',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'hist-002',
      title: '无效密码登录失败',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入无效密码', '点击登录按钮'],
      expectedResult: '显示错误提示：密码错误',
      priority: '高',
      module: '登录模块',
    },
  ]

  beforeEach(() => {
    // 创建 mock ModelManager
    mockModelManager = {
      generateForTask: jest.fn(),
      generateWithFallback: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({}),
      getTotalCost: jest.fn().mockReturnValue(0),
      selectModelForTask: jest.fn().mockReturnValue('kimi-k2.5'),
    } as unknown as jest.Mocked<ModelManager>

    generator = new TestCaseGenerator(mockModelManager)
    mockRetrieveSimilarTestCases.mockClear()
    // 默认 mock ModelManager 返回有效的 JSON
    mockModelManager.generateForTask.mockResolvedValue(JSON.stringify({
      testCases: [{
        title: '测试用例',
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expectedResult: '预期结果',
        priority: 'P0'
      }]
    }))
  })

  describe('Few-shot 示例集成', () => {
    it('应在生成用例前检索相似历史用例', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '用户登录功能测试',
        description: '测试用户登录的各种场景',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      mockRetrieveSimilarTestCases.mockResolvedValue([
        { testCase: mockHistoricalCases[0], similarity: 0.85 },
        { testCase: mockHistoricalCases[1], similarity: 0.75 },
      ])

      // 调用生成方法（需要实现 RAG 集成）
      await generator.generateFromTestPointWithRAG(testPoint, mockHistoricalCases)

      expect(mockRetrieveSimilarTestCases).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tp-001' }),
        mockHistoricalCases,
        expect.any(Object)
      )
    })

    it('应将检索到的用例作为 Few-shot 示例传入提示词', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录功能',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      mockRetrieveSimilarTestCases.mockResolvedValue([
        { testCase: mockHistoricalCases[0], similarity: 0.9 },
      ])

      // 验证提示词构建包含 Few-shot 示例
      const prompt = await generator.buildPromptWithFewShot(testPoint, mockHistoricalCases)

      expect(prompt).toContain('参考示例')
      expect(prompt).toContain(mockHistoricalCases[0].title)
      expect(prompt).toContain(mockHistoricalCases[0].steps[0])
    })

    it('应处理无相似用例的情况', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '全新功能测试',
        description: '测试前所未有的功能',
        priority: 'P0',
        relatedFeature: 'AI模块',
      }

      mockRetrieveSimilarTestCases.mockResolvedValue([])

      const prompt = await generator.buildPromptWithFewShot(testPoint, mockHistoricalCases)

      // 无相似用例时，提示词不应包含参考示例部分
      expect(prompt).not.toContain('参考示例')
    })

    it('应限制 Few-shot 示例数量（最多3条）', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      // 模拟返回 5 条相似用例
      const manyCases = Array(5).fill(null).map((_, i) => ({
        testCase: { ...mockHistoricalCases[0], id: `hist-${i}` },
        similarity: 0.9 - i * 0.05,
      }))

      mockRetrieveSimilarTestCases.mockResolvedValue(manyCases)

      const prompt = await generator.buildPromptWithFewShot(testPoint, mockHistoricalCases)

      // 验证只包含最多 3 条示例
      const exampleMatches = prompt.match(/示例 \d+/g)
      expect(exampleMatches?.length || 0).toBeLessThanOrEqual(3)
    })
  })

  describe('RAG 配置选项', () => {
    it('应支持自定义相似度阈值', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      await generator.generateFromTestPointWithRAG(testPoint, mockHistoricalCases, {
        minSimilarity: 0.8,
        maxResults: 2,
      })

      expect(mockRetrieveSimilarTestCases).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.objectContaining({
          minSimilarity: 0.8,
          maxResults: 2,
        })
      )
    })

    it('应支持禁用 RAG 功能', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      // 禁用 RAG 时，不应调用检索
      await generator.generateFromTestPoint(testPoint, { useRAG: false })

      expect(mockRetrieveSimilarTestCases).not.toHaveBeenCalled()
    })
  })

  describe('批量生成集成', () => {
    it('批量生成时应为每个测试点分别检索相似用例', async () => {
      const testPoints: TestPoint[] = [
        {
          id: 'tp-001',
          name: '登录测试',
          description: '测试登录',
          priority: 'P0',
          relatedFeature: '登录模块',
        },
        {
          id: 'tp-002',
          name: '注册测试',
          description: '测试注册',
          priority: 'P0',
          relatedFeature: '注册模块',
        },
      ]

      mockRetrieveSimilarTestCases
        .mockResolvedValueOnce([{ testCase: mockHistoricalCases[0], similarity: 0.9 }])
        .mockResolvedValueOnce([{ testCase: mockHistoricalCases[1], similarity: 0.8 }])

      await generator.generateFromTestPointsWithRAG(testPoints, mockHistoricalCases)

      expect(mockRetrieveSimilarTestCases).toHaveBeenCalledTimes(2)
    })
  })

  describe('提示词质量', () => {
    it('Few-shot 示例应包含完整的用例结构', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      mockRetrieveSimilarTestCases.mockResolvedValue([
        { testCase: mockHistoricalCases[0], similarity: 0.9 },
      ])

      const prompt = await generator.buildPromptWithFewShot(testPoint, mockHistoricalCases)

      // 验证示例包含完整结构
      expect(prompt).toContain('标题:')
      expect(prompt).toContain('前置条件:')
      expect(prompt).toContain('测试步骤:')
      expect(prompt).toContain('预期结果:')
    })

    it('应包含相似度分数说明', async () => {
      const testPoint: TestPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0',
        relatedFeature: '登录模块',
      }

      mockRetrieveSimilarTestCases.mockResolvedValue([
        { testCase: mockHistoricalCases[0], similarity: 0.92 },
      ])

      const prompt = await generator.buildPromptWithFewShot(testPoint, mockHistoricalCases)

      expect(prompt).toContain('相似度')
      expect(prompt).toContain('92%')
    })
  })
})
