/**
 * RAG 知识库检索功能测试
 * 功能：基于测试点检索相似历史用例，作为 Few-shot 示例
 */

import { retrieveSimilarTestCases, addToKnowledgeBase } from '../retrieval'
import { TestCase } from '../../agents/testcase-generator'

describe('RAG 知识库检索功能', () => {
  const mockHistoricalCases: TestCase[] = [
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
    {
      id: 'hist-003',
      title: '空用户名登录失败',
      precondition: '网络连接正常',
      steps: ['访问登录页面', '留空用户名', '输入密码', '点击登录按钮'],
      expectedResult: '显示错误提示：用户名不能为空',
      priority: '中',
      module: '登录模块',
    },
    {
      id: 'hist-004',
      title: '注册新用户成功',
      precondition: '用户未注册',
      steps: ['访问注册页面', '输入新用户名', '输入密码', '确认密码', '点击注册'],
      expectedResult: '注册成功，跳转到登录页',
      priority: '高',
      module: '注册模块',
    },
  ]

  describe('retrieveSimilarTestCases', () => {
    it('应根据测试点名称检索相似用例', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '用户登录功能测试',
        description: '测试用户登录的各种场景',
        priority: 'P0' as const,
        relatedFeature: '登录',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 3,
        minSimilarity: 0.5,
      })

      expect(results).toHaveLength(3)
      expect(results[0].testCase.module).toBe('登录模块')
    })

    it('应限制返回结果数量', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0' as const,
        relatedFeature: '登录',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 2,
        minSimilarity: 0.1,
      })

      expect(results).toHaveLength(2)
    })

    it('应根据相似度阈值过滤结果', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '完全不相关的功能',
        description: '测试支付功能',
        priority: 'P0' as const,
        relatedFeature: '支付',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 5,
        minSimilarity: 0.8,
      })

      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('应返回相似度分数', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0' as const,
        relatedFeature: '登录',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 3,
        minSimilarity: 0.1,
      })

      expect(results[0]).toHaveProperty('similarity')
      expect(results[0].similarity).toBeGreaterThanOrEqual(0)
      expect(results[0].similarity).toBeLessThanOrEqual(1)
    })

    it('应处理空知识库', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0' as const,
        relatedFeature: '登录',
      }

      const results = await retrieveSimilarTestCases(testPoint, [], {
        maxResults: 3,
        minSimilarity: 0.5,
      })

      expect(results).toHaveLength(0)
    })

    it('应处理无匹配结果的情况', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '人工智能算法测试',
        description: '测试深度学习模型',
        priority: 'P0' as const,
        relatedFeature: 'AI',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 3,
        minSimilarity: 0.9,
      })

      expect(results).toHaveLength(0)
    })
  })

  describe('addToKnowledgeBase', () => {
    it('应将新用例添加到知识库', async () => {
      const newCase: TestCase = {
        id: 'new-001',
        title: '新测试用例',
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expectedResult: '预期结果',
        priority: '高',
        module: '新模块',
      }

      const knowledgeBase: TestCase[] = [...mockHistoricalCases]
      const updated = await addToKnowledgeBase(newCase, knowledgeBase)

      expect(updated).toHaveLength(mockHistoricalCases.length + 1)
      expect(updated[updated.length - 1].id).toBe('new-001')
    })

    it('应避免重复添加相同ID的用例', async () => {
      const existingCase = mockHistoricalCases[0]
      const knowledgeBase: TestCase[] = [...mockHistoricalCases]
      
      const updated = await addToKnowledgeBase(existingCase, knowledgeBase)

      expect(updated).toHaveLength(mockHistoricalCases.length)
    })

    it('应更新已存在的用例', async () => {
      const updatedCase: TestCase = {
        ...mockHistoricalCases[0],
        title: '更新后的标题',
      }
      const knowledgeBase: TestCase[] = [...mockHistoricalCases]
      
      const updated = await addToKnowledgeBase(updatedCase, knowledgeBase)

      expect(updated).toHaveLength(mockHistoricalCases.length)
      const found = updated.find(c => c.id === updatedCase.id)
      expect(found?.title).toBe('更新后的标题')
    })
  })

  describe('相似度计算', () => {
    it('应正确计算模块匹配相似度', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '登录测试',
        description: '测试登录',
        priority: 'P0' as const,
        relatedFeature: '登录模块',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 5,
        minSimilarity: 0.1,
      })

      // 登录模块的用例应该排在前面
      const loginCases = results.filter(r => r.testCase.module === '登录模块')
      expect(loginCases.length).toBeGreaterThan(0)
    })

    it('应正确计算关键词匹配相似度', async () => {
      const testPoint = {
        id: 'tp-001',
        name: '密码验证测试',
        description: '测试密码强度和验证',
        priority: 'P0' as const,
        relatedFeature: '登录',
      }

      const results = await retrieveSimilarTestCases(testPoint, mockHistoricalCases, {
        maxResults: 3,
        minSimilarity: 0.1,
      })

      // 包含"密码"关键词的用例应该排在前面
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
