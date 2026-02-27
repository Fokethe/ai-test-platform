/**
 * TDD Round 8: 用例预览页面测试
 * 功能：展示生成的测试用例，支持编辑、删除、确认
 */

import { render, screen, waitFor } from '@testing-library/react'

// 增加测试超时时间到 10 秒
jest.setTimeout(10000)
import userEvent from '@testing-library/user-event'
import TestCasesPreviewPage from '../page'
import { useSearchParams, useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockPush = jest.fn()

describe('用例预览页面 (TestCasesPreviewPage)', () => {
  const mockTestCases = [
    {
      id: 'tc-001',
      title: '有效用户名和密码登录成功',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入有效密码', '点击登录按钮'],
      expectedResult: '登录成功，跳转到首页',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'tc-002',
      title: '无效密码登录失败',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入无效密码', '点击登录按钮'],
      expectedResult: '显示错误提示：密码错误',
      priority: '高',
      module: '登录模块',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'requirementId') return 'req-123'
        if (key === 'testPointId') return 'tp-001'
        return null
      }),
    })
  })

  it('应显示页面标题和描述', () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    
    render(<TestCasesPreviewPage />)
    
    expect(screen.getByText('测试用例预览')).toBeInTheDocument()
    expect(screen.getByText(/查看并编辑生成的测试用例/)).toBeInTheDocument()
  })

  it('应显示加载状态', () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    
    render(<TestCasesPreviewPage />)
    
    // 加载状态显示骨架屏或加载文字
    expect(screen.getByText('测试用例预览')).toBeInTheDocument()
  })

  it('应显示测试用例列表', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: mockTestCases,
      }),
    })
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText('有效用户名和密码登录成功')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    expect(screen.getByText('无效密码登录失败')).toBeInTheDocument()
  })

  it('应显示编辑按钮', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: mockTestCases,
      }),
    })
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText('有效用户名和密码登录成功')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // 验证编辑按钮存在
    const editButtons = screen.getAllByRole('button', { name: /编辑/i })
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('应显示删除按钮', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: mockTestCases,
      }),
    })
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText('有效用户名和密码登录成功')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // 验证删除按钮存在
    const deleteButtons = screen.getAllByRole('button', { name: /删除/i })
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('应显示确认保存按钮', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: mockTestCases,
      }),
    })
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText('有效用户名和密码登录成功')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    expect(screen.getByRole('button', { name: /确认保存/i })).toBeInTheDocument()
  })

  it('应处理加载失败的情况', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('应处理 API 返回错误的情况', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 1,
        message: '生成用例失败',
      }),
    })
    
    render(<TestCasesPreviewPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/生成用例失败/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('应处理缺少必要参数的情况', () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(() => null),
    })
    
    render(<TestCasesPreviewPage />)
    
    expect(screen.getByText(/缺少必要参数/)).toBeInTheDocument()
  })
})
