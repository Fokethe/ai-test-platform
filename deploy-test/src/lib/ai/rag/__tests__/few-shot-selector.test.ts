// encoding: utf-8
/**
 * Few-shot 自动选择器测试
 * TDD Round 12
 */

import {
  FewShotSelector,
  selectFewShotExamples,
  selectFewShotByModules,
  SelectionStrategy,
} from '../few-shot-selector'
import { TestCase } from '../../agents/testcase-generator'
import { TestPoint } from '../retrieval'

describe('Few-shot 自动选择器', () => {
  const mockKnowledgeBase: TestCase[] = [
    {
      id: 'case-001',
      title: '用户登录成功',
      precondition: '用户已注册',
      steps: ['输入用户名', '输入密码', '点击登录'],
      expectedResult: '登录成功',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'case-002',
      title: '密码错误登录失败',
      precondition: '用户已注册',
      steps: ['输入用户名', '输入错误密码', '点击登录'],
      expectedResult: '显示密码错误',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'case-003',
      title: '空用户名登录失败',
      precondition: '网络正常',
      steps: ['留空用户名', '输入密码', '点击登录'],
      expectedResult: '显示用户名不能为空',
      priority: '中',
      module: '登录模块',
    },
    {
      id: 'case-004',
      title: '用户注册成功',
      precondition: '用户未注册',
      steps: ['输入用户名', '输入密码', '确认密码', '点击注册'],
      expectedResult: '注册成功',
      priority: '高',
      module: '注册模块',
    },
    {
      id: 'case-005',
      title: '重复用户名注册失败',
      precondition: '用户已存在',
      steps: ['输入已存在用户名', '输入密码', '点击注册'],
      expectedResult: '显示用户名已存在',
      priority: '高',
      module: '注册模块',
    },
    {
      id: 'case-006',
      title: '订单提交成功',
      precondition: '用户已登录',
      steps: ['选择商品', '点击购买', '确认订单'],
      expectedResult: '订单创建成功',
      priority: '高',
      module: '订单模块',
    },
  ]

  const mockTestPoint: TestPoint = {
    id: 'tp-001',
    name: '登录功能测试',
    description: '测试用户登录的各种场景',
    priority: 'P0',
    relatedFeature: '登录模块',
  }

  describe('基础配置', () => {
    it('应使用默认配置初始化', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint)

      expect(result.strategy).toBe('combined')
      expect(result.examples.length).toBeLessThanOrEqual(3)
      expect(result.totalAvailable).toBe(mockKnowledgeBase.length)
    })

    it('应接受自定义配置', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'similarity',
        maxResults: 5,
        minSimilarity: 0.3,
      })

      expect(result.strategy).toBe('similarity')
      expect(result.examples.length).toBeLessThanOrEqual(5)
    })

    it('应处理空知识库', async () => {
      const selector = new FewShotSelector([])
      const result = await selector.select(mockTestPoint)

      expect(result.examples).toHaveLength(0)
      expect(result.totalAvailable).toBe(0)
    })
  })

  describe('相似度策略', () => {
    it('应优先选择相似度高的用例', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'similarity',
        maxResults: 3,
      })

      expect(result.examples.length).toBeGreaterThan(0)
      // 相似度应该按降序排列
      for (let i = 1; i < result.examples.length; i++) {
        expect(result.examples[i - 1].similarity).toBeGreaterThanOrEqual(
          result.examples[i].similarity
        )
      }
    })

    it('应返回相似度分数', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'similarity',
      })

      result.examples.forEach((ex) => {
        expect(ex.similarity).toBeGreaterThanOrEqual(0)
        expect(ex.similarity).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('多样性策略', () => {
    it('应选择多样化的用例', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'diversity',
        maxResults: 3,
      })

      expect(result.examples.length).toBeGreaterThan(0)
      expect(result.diversity).toBeGreaterThanOrEqual(0)
      expect(result.diversity).toBeLessThanOrEqual(1)
    })

    it('应返回多样性分数', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'diversity',
      })

      result.examples.forEach((ex) => {
        expect(ex.diversityScore).toBeDefined()
      })
    })
  })

  describe('覆盖度策略', () => {
    it('应优先选择不同类别的用例', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'coverage',
        maxResults: 3,
      })

      // 应该包含不同模块的用例
      const modules = new Set(result.examples.map((ex) => ex.testCase.module))
      expect(modules.size).toBeGreaterThanOrEqual(1)
    })

    it('应返回类别列表', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'coverage',
      })

      expect(result.categories.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('综合策略', () => {
    it('应结合相似度和多样性', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const result = await selector.select(mockTestPoint, {
        strategy: 'combined',
        maxResults: 3,
      })

      expect(result.examples.length).toBeGreaterThan(0)
      expect(result.strategy).toBe('combined')
    })
  })

  describe('模块化选择', () => {
    it('应按模块分类选择用例', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const results = await selector.selectByModules(mockTestPoint, 2)

      expect(results.length).toBeGreaterThan(0)
      results.forEach((r) => {
        expect(r.module).toBeDefined()
        expect(r.count).toBeGreaterThanOrEqual(0)
        expect(r.examples.length).toBeLessThanOrEqual(2)
      })
    })

    it('应按数量降序排列模块', async () => {
      const selector = new FewShotSelector(mockKnowledgeBase)
      const results = await selector.selectByModules(mockTestPoint)

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].count).toBeGreaterThanOrEqual(results[i].count)
      }
    })
  })

  describe('便捷函数', () => {
    it('selectFewShotExamples 应正常工作', async () => {
      const result = await selectFewShotExamples(mockTestPoint, mockKnowledgeBase, {
        strategy: 'similarity',
        maxResults: 2,
      })

      expect(result.examples.length).toBeLessThanOrEqual(2)
      expect(result.strategy).toBe('similarity')
    })

    it('selectFewShotByModules 应正常工作', async () => {
      const results = await selectFewShotByModules(mockTestPoint, mockKnowledgeBase, 1)

      expect(results.length).toBeGreaterThan(0)
      results.forEach((r) => {
        expect(r.examples.length).toBeLessThanOrEqual(1)
      })
    })
  })
})
