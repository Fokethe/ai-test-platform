/**
 * @file AI 生成入口页面测试
 * @description 测试 AI 生成功能入口页面
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
}

// Dynamically import the component after mocks are set up
const getAIGeneratePage = async () => {
  const { default: AIGeneratePage } = await import('../../ai-generate/page')
  return AIGeneratePage
}

describe('AIGeneratePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('页面渲染', () => {
    it('应该渲染页面标题和描述', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('AI 智能生成')).toBeInTheDocument()
      expect(screen.getByText('利用 AI 技术快速生成测试需求和测试用例，提升测试效率')).toBeInTheDocument()
    })

    it('应该渲染需求生成功能卡片', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('需求生成')).toBeInTheDocument()
      expect(screen.getByText('从需求文档或描述自动生成结构化需求')).toBeInTheDocument()
    })

    it('应该渲染用例生成功能卡片', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('用例生成')).toBeInTheDocument()
      expect(screen.getByText('基于需求自动生成测试用例')).toBeInTheDocument()
    })
  })

  describe('导航功能', () => {
    it('点击需求生成卡片应导航到需求生成页面', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      const requirementCard = screen.getByTestId('requirement-card')
      fireEvent.click(requirementCard)

      expect(mockRouter.push).toHaveBeenCalledWith('/ai-generate/requirements')
    })

    it('点击用例生成卡片应导航到用例生成页面', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      const testcaseCard = screen.getByTestId('testcase-card')
      fireEvent.click(testcaseCard)

      expect(mockRouter.push).toHaveBeenCalledWith('/ai-generate/testcases')
    })

    it('需求生成页面的链接应正确', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      const requirementButton = screen.getByTestId('requirement-button')
      expect(requirementButton).toHaveAttribute('href', '/ai-generate/requirements')
    })

    it('用例生成页面的链接应正确', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      const testcaseButton = screen.getByTestId('testcase-button')
      expect(testcaseButton).toHaveAttribute('href', '/ai-generate/testcases')
    })
  })

  describe('功能特点展示', () => {
    it('应该显示需求生成的功能特点', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('智能解析需求文档')).toBeInTheDocument()
      expect(screen.getByText('自动提取测试要点')).toBeInTheDocument()
      expect(screen.getByText('生成结构化需求')).toBeInTheDocument()
    })

    it('应该显示用例生成的功能特点', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('基于需求生成')).toBeInTheDocument()
      expect(screen.getByText('多场景覆盖')).toBeInTheDocument()
      expect(screen.getByText('支持边界值和异常')).toBeInTheDocument()
    })
  })

  describe('最近生成历史', () => {
    it('应该显示最近生成历史区域', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      expect(screen.getByText('最近生成')).toBeInTheDocument()
    })

    it('应该显示跳转到历史页面的链接', async () => {
      const AIGeneratePage = await getAIGeneratePage()
      render(<AIGeneratePage />)

      const historyLink = screen.getByTestId('history-link')
      expect(historyLink).toHaveAttribute('href', '/tests?tab=ai')
    })
  })
})
