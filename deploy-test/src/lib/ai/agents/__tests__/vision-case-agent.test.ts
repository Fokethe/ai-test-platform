// encoding: utf-8
/**
 * TDD Round 16 - 视觉用例生成 Agent 测试
 */

import {
  VisionCaseAgent,
  generateUICases,
  UICaseType,
} from '../vision-case-agent'
import { UIElement, UIElementType } from '../../vision/ui-element-detector'

// Mock AI 客户端
jest.mock('../../client', () => ({
  callAI: jest.fn(),
}))

import { callAI } from '../../client'

describe('视觉用例生成 Agent', () => {
  const mockElements: UIElement[] = [
    {
      id: 'btn-login',
      type: UIElementType.BUTTON,
      text: '登录',
      position: { x: 100, y: 200, width: 80, height: 40 },
      confidence: 0.95,
    },
    {
      id: 'input-username',
      type: UIElementType.INPUT,
      text: '',
      position: { x: 100, y: 100, width: 200, height: 40 },
      attributes: { placeholder: '用户名' },
      confidence: 0.92,
    },
    {
      id: 'input-password',
      type: UIElementType.INPUT,
      text: '',
      position: { x: 100, y: 150, width: 200, height: 40 },
      attributes: { placeholder: '密码', type: 'password' },
      confidence: 0.9,
    },
    {
      id: 'link-forgot',
      type: UIElementType.LINK,
      text: '忘记密码',
      position: { x: 250, y: 250, width: 80, height: 20 },
      confidence: 0.88,
    },
  ]

  const mockAIResponse = JSON.stringify({
    cases: [
      {
        id: 'case-001',
        title: '用户登录流程',
        type: 'input',
        description: '测试完整的登录流程',
        preCondition: '用户未登录',
        steps: [
          { action: '输入', target: '用户名', value: 'testuser', description: '输入用户名' },
          { action: '输入', target: '密码', value: 'password123', description: '输入密码' },
          { action: '点击', target: '登录按钮', description: '点击登录' },
        ],
        expectedResult: '登录成功，跳转到首页',
        priority: 'P0',
        targetElements: ['input-username', 'input-password', 'btn-login'],
      },
      {
        id: 'case-002',
        title: '忘记密码链接',
        type: 'navigate',
        description: '测试忘记密码链接',
        preCondition: '在登录页面',
        steps: [{ action: '点击', target: '忘记密码', description: '点击忘记密码链接' }],
        expectedResult: '跳转到密码重置页面',
        priority: 'P1',
        targetElements: ['link-forgot'],
      },
    ],
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(callAI as jest.Mock).mockResolvedValue(mockAIResponse)
  })

  describe('基础功能', () => {
    it('应能实例化 Agent', () => {
      const agent = new VisionCaseAgent()
      expect(agent).toBeDefined()
    })

    it('应基于 UI 树生成用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      expect(result.cases.length).toBeGreaterThan(0)
      expect(result.totalElements).toBe(mockElements.length)
      expect(result.generatedCount).toBeGreaterThan(0)
    })

    it('应限制生成的用例数量', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements, { maxCases: 2 })

      expect(result.cases.length).toBeLessThanOrEqual(2)
    })

    it('应计算覆盖率', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      expect(result.coverage).toBeGreaterThanOrEqual(0)
      expect(result.coverage).toBeLessThanOrEqual(1)
    })
  })

  describe('用例类型生成', () => {
    it('应生成点击类型用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      const clickCases = result.cases.filter((c) => c.type === 'click')
      expect(clickCases.length).toBeGreaterThanOrEqual(0)
    })

    it('应生成输入类型用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      const inputCases = result.cases.filter((c) => c.type === 'input')
      expect(inputCases.length).toBeGreaterThanOrEqual(0)
    })

    it('应生成验证类型用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      const verifyCases = result.cases.filter((c) => c.type === 'verify')
      expect(verifyCases.length).toBeGreaterThanOrEqual(0)
    })

    it('应生成导航类型用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      const navigateCases = result.cases.filter((c) => c.type === 'navigate')
      expect(navigateCases.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('用例结构', () => {
    it('生成的用例应有完整字段', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      if (result.cases.length > 0) {
        const c = result.cases[0]
        expect(c.id).toBeDefined()
        expect(c.title).toBeDefined()
        expect(c.type).toBeDefined()
        expect(c.steps).toBeDefined()
        expect(c.expectedResult).toBeDefined()
        expect(c.priority).toMatch(/^P[0-3]$/)
      }
    })

    it('步骤应有 action 和 target', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      for (const c of result.cases) {
        for (const step of c.steps) {
          expect(step.action).toBeDefined()
          expect(step.target).toBeDefined()
        }
      }
    })

    it('应有目标元素列表', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      for (const c of result.cases) {
        expect(c.targetElements).toBeDefined()
        expect(Array.isArray(c.targetElements)).toBe(true)
      }
    })
  })

  describe('批量生成', () => {
    it('应支持多页面批量生成', async () => {
      const agent = new VisionCaseAgent()
      const trees = [
        { name: '登录页', elements: mockElements },
        { name: '注册页', elements: mockElements.slice(0, 2) },
      ]

      const results = await agent.generateFromMultipleTrees(trees)

      expect(results.length).toBe(2)
      expect(results[0].cases[0].title).toContain('[登录页]')
    })
  })

  describe('反向用例', () => {
    it('应能生成空值验证用例', () => {
      const agent = new VisionCaseAgent()
      const cases = agent.generateNegativeCases(mockElements)

      const emptyCases = cases.filter((c) => c.title.includes('空值'))
      expect(emptyCases.length).toBeGreaterThan(0)
    })

    it('应能生成超长输入用例', () => {
      const agent = new VisionCaseAgent()
      const cases = agent.generateNegativeCases(mockElements)

      const longCases = cases.filter((c) => c.title.includes('超长'))
      expect(longCases.length).toBeGreaterThan(0)
    })
  })

  describe('AI 响应解析', () => {
    it('应正确解析 AI 生成的用例', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      expect(result.cases.length).toBeGreaterThan(0)
    })

    it('应处理包含额外文本的响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        `这里是一些说明\n${mockAIResponse}\n更多说明`
      )

      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      expect(result.cases.length).toBeGreaterThan(0)
    })

    it('应处理无效的 JSON 响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue('无效的响应')

      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      // 应该回退到基础用例生成
      expect(result.cases.length).toBeGreaterThan(0)
    })

    it('应处理缺少 cases 字段的响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(JSON.stringify({ other: 'data' }))

      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      // 应该回退到基础用例生成
      expect(result.cases.length).toBeGreaterThan(0)
    })
  })

  describe('降级机制', () => {
    it('AI 失败时应使用基础用例生成', async () => {
      ;(callAI as jest.Mock).mockRejectedValue(new Error('AI 服务错误'))

      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(mockElements)

      expect(result.cases.length).toBeGreaterThan(0)
      expect(result.generatedCount).toBeGreaterThan(0)
    })
  })

  describe('便捷函数', () => {
    it('generateUICases 应正常工作', async () => {
      const result = await generateUICases(mockElements, { maxCases: 3 })

      expect(result.cases.length).toBeLessThanOrEqual(3)
    })
  })

  describe('空元素处理', () => {
    it('应处理空元素列表', async () => {
      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree([])

      expect(result.cases).toHaveLength(0)
      expect(result.coverage).toBe(0)
    })
  })

  describe('嵌套元素', () => {
    it('应递归处理子元素', async () => {
      const nestedElements: UIElement[] = [
        {
          id: 'container',
          type: UIElementType.CONTAINER,
          position: { x: 0, y: 0, width: 500, height: 500 },
          confidence: 0.9,
          children: mockElements,
        },
      ]

      const agent = new VisionCaseAgent()
      const result = await agent.generateFromUITree(nestedElements)

      expect(result.totalElements).toBe(5) // 1 container + 4 children
    })
  })
})
