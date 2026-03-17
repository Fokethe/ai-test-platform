/**
 * TDD Round 17: 用例预览页面接收 modelId 参数测试
 */

import { render, screen, waitFor } from '@testing-library/react'
import { useSearchParams, useRouter } from 'next/navigation'
import TestCasesPreviewPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('TDD Round 17: 用例预览页面接收 modelId 参数', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as unknown as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  describe('✅ 正常场景', () => {
    it('应从 URL 参数中读取 modelId', async () => {
      // 模拟 URL 参数包含 modelId
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            modelId: 'qwen-3',
          }
          return params[key] || null
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [
            {
              id: 'tc-001',
              title: '测试用例1',
              precondition: '前置条件',
              steps: ['步骤1', '步骤2'],
              expectedResult: '预期结果',
              priority: '高',
              module: '登录模块',
            },
          ],
        }),
      })

      render(<TestCasesPreviewPage />)

      // 等待 API 调用
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/requirements/req-001/generate-testcases',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('modelId'),
          })
        )
      })

      // 验证请求体中包含 modelId
      const fetchCall = (fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody).toHaveProperty('modelId', 'qwen-3')
      expect(requestBody).toHaveProperty('testPointIds', ['tp-001'])
    })

    it('应支持 kimi-k2.5 模型', async () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            modelId: 'kimi-k2.5',
          }
          return params[key] || null
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [],
        }),
      })

      render(<TestCasesPreviewPage />)

      await waitFor(() => {
        const fetchCall = (fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody).toHaveProperty('modelId', 'kimi-k2.5')
      })
    })

    it('应显示当前使用的模型信息', async () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            modelId: 'qwen-3',
          }
          return params[key] || null
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [
            {
              id: 'tc-001',
              title: '测试用例1',
              precondition: '前置条件',
              steps: ['步骤1'],
              expectedResult: '预期结果',
              priority: '高',
              module: '登录模块',
            },
          ],
        }),
      })

      render(<TestCasesPreviewPage />)

      // 验证页面显示模型信息 - 使用更精确的选择器
      await waitFor(() => {
        // 查找 Badge 组件中的模型名称
        const badge = screen.getByText('千问 3')
        expect(badge).toBeInTheDocument()
        expect(badge.tagName.toLowerCase()).toBe('span')
      })
    })
  })

  describe('⚠️ 边界场景', () => {
    it('当 modelId 未提供时应使用默认值 kimi-k2.5', async () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            // modelId 未提供
          }
          return params[key] || null
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [],
        }),
      })

      render(<TestCasesPreviewPage />)

      await waitFor(() => {
        const fetchCall = (fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody).toHaveProperty('modelId', 'kimi-k2.5')
      })
    })

    it('当 modelId 为空字符串时应使用默认值', async () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string | null> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            modelId: '', // 空字符串
          }
          return params[key]
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [],
        }),
      })

      render(<TestCasesPreviewPage />)

      await waitFor(() => {
        const fetchCall = (fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody).toHaveProperty('modelId', 'kimi-k2.5')
      })
    })
  })

  describe('🔒 安全场景', () => {
    it('不应接受无效的 modelId 值', async () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => {
          const params: Record<string, string> = {
            requirementId: 'req-001',
            testPointId: 'tp-001',
            modelId: 'invalid-model',
          }
          return params[key] || null
        },
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          data: [],
        }),
      })

      render(<TestCasesPreviewPage />)

      // 无效模型应回退到默认值
      await waitFor(() => {
        const fetchCall = (fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        // 应该使用默认值或过滤无效值
        expect(['kimi-k2.5', 'qwen-3']).toContain(requestBody.modelId)
      })
    })
  })
})
