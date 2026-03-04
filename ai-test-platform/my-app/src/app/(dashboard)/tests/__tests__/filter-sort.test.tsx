/**
 * TDD Round 5.1: 列表筛选和排序功能测试
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import TestCenterPage from '../page'

// Mock Next.js navigation
const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock fetch for SWR
global.fetch = jest.fn()

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('列表筛选和排序功能', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          list: [
            { id: '1', name: '测试用例1', priority: 'HIGH', status: 'ACTIVE', createdAt: '2024-01-01' },
            { id: '2', name: '测试用例2', priority: 'LOW', status: 'DRAFT', createdAt: '2024-01-02' },
          ],
          pagination: { total: 2, page: 1, pageSize: 20, totalPages: 1 }
        }
      }),
    })
  })

  describe('筛选功能', () => {
    it('应该显示优先级筛选下拉框', () => {
      render(<TestCenterPage />)
      
      expect(screen.getByTestId('priority-filter')).toBeInTheDocument()
    })

    it('应该显示状态筛选下拉框', () => {
      render(<TestCenterPage />)
      
      expect(screen.getByTestId('status-filter')).toBeInTheDocument()
    })

    it('选择优先级筛选应更新列表', async () => {
      render(<TestCenterPage />)
      
      const priorityFilter = screen.getByTestId('priority-filter')
      fireEvent.click(priorityFilter)
      
      // 选择 HIGH 优先级
      const highOption = screen.getByText('高优先级')
      fireEvent.click(highOption)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('priority=HIGH'),
          expect.any(Object)
        )
      })
    })

    it('选择状态筛选应更新列表', async () => {
      render(<TestCenterPage />)
      
      const statusFilter = screen.getByTestId('status-filter')
      fireEvent.click(statusFilter)
      
      // 选择 ACTIVE 状态
      const activeOption = screen.getByText('已激活')
      fireEvent.click(activeOption)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=ACTIVE'),
          expect.any(Object)
        )
      })
    })

    it('清除筛选按钮应重置所有筛选条件', async () => {
      render(<TestCenterPage />)
      
      // 先设置一个筛选条件
      const priorityFilter = screen.getByTestId('priority-filter')
      fireEvent.click(priorityFilter)
      fireEvent.click(screen.getByText('高优先级'))
      
      // 点击清除按钮
      const clearButton = screen.getByTestId('clear-filters-button')
      fireEvent.click(clearButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('priority='),
          expect.any(Object)
        )
      })
    })
  })

  describe('排序功能', () => {
    it('应该显示排序下拉框', () => {
      render(<TestCenterPage />)
      
      expect(screen.getByTestId('sort-select')).toBeInTheDocument()
    })

    it('应该支持按创建时间排序', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('sort-select'))
      
      expect(screen.getByText('最新创建')).toBeInTheDocument()
      expect(screen.getByText('最早创建')).toBeInTheDocument()
    })

    it('应该支持按名称排序', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('sort-select'))
      
      expect(screen.getByText('名称 A-Z')).toBeInTheDocument()
      expect(screen.getByText('名称 Z-A')).toBeInTheDocument()
    })

    it('应该支持按优先级排序', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('sort-select'))
      
      expect(screen.getByText('优先级高到低')).toBeInTheDocument()
      expect(screen.getByText('优先级低到高')).toBeInTheDocument()
    })

    it('选择排序应更新列表', async () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('sort-select'))
      fireEvent.click(screen.getByText('最新创建'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=createdAt&order=desc'),
          expect.any(Object)
        )
      })
    })

    it('排序方向切换应生效', async () => {
      render(<TestCenterPage />)
      
      // 先选择按名称排序
      fireEvent.click(screen.getByTestId('sort-select'))
      fireEvent.click(screen.getByText('名称 A-Z'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=name&order=asc'),
          expect.any(Object)
        )
      })
    })
  })

  describe('筛选和排序组合', () => {
    it('应同时应用筛选和排序', async () => {
      render(<TestCenterPage />)
      
      // 设置筛选条件
      fireEvent.click(screen.getByTestId('priority-filter'))
      fireEvent.click(screen.getByText('高优先级'))
      
      // 设置排序
      fireEvent.click(screen.getByTestId('sort-select'))
      fireEvent.click(screen.getByText('最新创建'))
      
      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls
        const lastCall = calls[calls.length - 1][0]
        expect(lastCall).toContain('priority=HIGH')
        expect(lastCall).toContain('sort=createdAt')
      })
    })
  })
})
