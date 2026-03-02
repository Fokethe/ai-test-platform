// encoding: utf-8
/**
 * TDD Round 15 - UI 元素识别测试
 */

import {
  detectUIElements,
  findElementByText,
  findElementsByType,
  generateLocator,
  UIElementType,
} from '../ui-element-detector'

// Mock AI 客户端
jest.mock('../../client', () => ({
  callAI: jest.fn(),
}))

import { callAI } from '../../client'

describe('UI 元素识别', () => {
  const mockScreenshot = Buffer.from('fake-screenshot-data')

  const mockAIResponse = JSON.stringify({
    elements: [
      {
        type: 'button',
        text: '登录',
        position: { x: 100, y: 200, width: 80, height: 40 },
        attributes: { id: 'login-btn', class: 'btn-primary' },
        confidence: 0.95,
      },
      {
        type: 'input',
        text: '',
        position: { x: 100, y: 100, width: 200, height: 40 },
        attributes: { id: 'username', placeholder: '请输入用户名' },
        confidence: 0.92,
      },
      {
        type: 'input',
        text: '',
        position: { x: 100, y: 150, width: 200, height: 40 },
        attributes: { id: 'password', type: 'password' },
        confidence: 0.9,
      },
      {
        type: 'link',
        text: '忘记密码',
        position: { x: 250, y: 250, width: 80, height: 20 },
        attributes: { href: '/forgot-password' },
        confidence: 0.88,
      },
    ],
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(callAI as jest.Mock).mockResolvedValue(mockAIResponse)
  })

  describe('元素类型分类', () => {
    it('应正确识别按钮元素', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const buttons = findElementsByType(result.elements, UIElementType.BUTTON)
      expect(buttons.length).toBeGreaterThan(0)
      expect(buttons[0].text).toBe('登录')
    })

    it('应正确识别输入框元素', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const inputs = findElementsByType(result.elements, UIElementType.INPUT)
      expect(inputs.length).toBe(2)
    })

    it('应正确识别链接元素', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const links = findElementsByType(result.elements, UIElementType.LINK)
      expect(links.length).toBe(1)
      expect(links[0].text).toBe('忘记密码')
    })

    it('应处理未知类型元素', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        JSON.stringify({
          elements: [
            { type: 'unknown-type', text: '未知', position: { x: 0, y: 0, width: 10, height: 10 } },
          ],
        })
      )
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements[0].type).toBe(UIElementType.UNKNOWN)
    })
  })

  describe('位置和大小编码', () => {
    it('应正确解析位置坐标', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const button = result.elements.find((el) => el.text === '登录')
      expect(button).toBeDefined()
      expect(button?.position.x).toBe(100)
      expect(button?.position.y).toBe(200)
      expect(button?.position.width).toBe(80)
      expect(button?.position.height).toBe(40)
    })

    it('应处理缺失位置信息', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        JSON.stringify({
          elements: [{ type: 'button', text: '测试' }],
        })
      )
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements[0].position).toEqual({ x: 0, y: 0, width: 0, height: 0 })
    })
  })

  describe('Qwen-VL 响应解析', () => {
    it('应正确解析标准 JSON 响应', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      expect(result.elements.length).toBe(4)
      expect(result.elementCount).toBe(4)
    })

    it('应处理包含额外文本的响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        `这里有一些说明文字\n${mockAIResponse}\n更多说明`
      )
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements.length).toBe(4)
    })

    it('应处理无效的 JSON 响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue('无效的响应')
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements).toHaveLength(0)
    })

    it('应处理空的 elements 数组', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(JSON.stringify({ elements: [] }))
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements).toHaveLength(0)
    })

    it('应处理缺少 elements 字段的响应', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(JSON.stringify({ other: 'data' }))
      
      const result = await detectUIElements(mockScreenshot)
      expect(result.elements).toHaveLength(0)
    })
  })

  describe('元素树构建', () => {
    it('应构建正确的父子关系', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        JSON.stringify({
          elements: [
            {
              type: 'container',
              position: { x: 0, y: 0, width: 500, height: 500 },
              confidence: 0.9,
            },
            {
              type: 'button',
              text: '内部按钮',
              position: { x: 50, y: 50, width: 80, height: 40 },
              confidence: 0.95,
            },
          ],
        })
      )
      
      const result = await detectUIElements(mockScreenshot, { detectChildren: true })
      const container = result.elements.find((el) => el.type === UIElementType.CONTAINER)
      
      expect(container?.children).toBeDefined()
      expect(container?.children?.length).toBe(1)
    })
  })

  describe('边界情况处理', () => {
    it('应按置信度过滤元素', async () => {
      ;(callAI as jest.Mock).mockResolvedValue(
        JSON.stringify({
          elements: [
            { type: 'button', confidence: 0.9, position: { x: 0, y: 0, width: 10, height: 10 } },
            { type: 'button', confidence: 0.3, position: { x: 0, y: 0, width: 10, height: 10 } },
          ],
        })
      )
      
      const result = await detectUIElements(mockScreenshot, { minConfidence: 0.5 })
      expect(result.elements.length).toBe(1)
    })
  })

  describe('元素查找', () => {
    it('findElementByText 应正确查找元素', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const element = findElementByText(result.elements, '登录')
      expect(element).toBeDefined()
      expect(element?.type).toBe(UIElementType.BUTTON)
    })

    it('findElementByText 应支持部分匹配', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const element = findElementByText(result.elements, '密码')
      expect(element).toBeDefined()
    })

    it('findElementByText 应处理不存在的文本', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const element = findElementByText(result.elements, '不存在')
      expect(element).toBeUndefined()
    })

    it('findElementsByType 应正确筛选类型', async () => {
      const result = await detectUIElements(mockScreenshot)
      
      const inputs = findElementsByType(result.elements, UIElementType.INPUT)
      expect(inputs.length).toBe(2)
    })
  })

  describe('元素定位生成', () => {
    it('应优先使用 data-testid', () => {
      const element = {
        id: 'test',
        type: UIElementType.BUTTON,
        position: { x: 0, y: 0, width: 10, height: 10 },
        confidence: 0.9,
        attributes: { 'data-testid': 'login-button' },
      }
      
      const locator = generateLocator(element)
      expect(locator).toBe('[data-testid="login-button"]')
    })

    it('应使用 id 作为第二选择', () => {
      const element = {
        id: 'test',
        type: UIElementType.BUTTON,
        position: { x: 0, y: 0, width: 10, height: 10 },
        confidence: 0.9,
        attributes: { id: 'login-btn' },
      }
      
      const locator = generateLocator(element)
      expect(locator).toBe('#login-btn')
    })

    it('应使用文本作为第三选择', () => {
      const element = {
        id: 'test',
        type: UIElementType.BUTTON,
        text: '提交',
        position: { x: 0, y: 0, width: 10, height: 10 },
        confidence: 0.9,
        attributes: {},
      }
      
      const locator = generateLocator(element)
      expect(locator).toBe('text="提交"')
    })

    it('应回退到 xpath', () => {
      const element = {
        id: 'test',
        type: UIElementType.BUTTON,
        position: { x: 0, y: 0, width: 10, height: 10 },
        confidence: 0.9,
        attributes: {},
      }
      
      const locator = generateLocator(element)
      expect(locator).toContain('xpath')
    })
  })

  describe('错误处理', () => {
    it('应处理 AI 调用失败', async () => {
      ;(callAI as jest.Mock).mockRejectedValue(new Error('AI 服务错误'))
      
      await expect(detectUIElements(mockScreenshot)).rejects.toThrow('UI 元素检测失败')
    })
  })
})
