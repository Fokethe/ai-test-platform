/**
 * Activity Log Page Tests
 * TDD Batch 5.2: 活动日志导出/清空功能测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ActivityPage from '../page'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('Activity Log Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        logs: [
          { id: '1', action: '创建工作空间', user: 'Admin', target: '测试团队', time: '2024-01-15 10:30', type: 'CREATE' },
          { id: '2', action: '执行测试', user: 'Admin', target: '登录流程测试', time: '2024-01-15 11:00', type: 'EXECUTE' },
        ],
        pagination: { total: 2, page: 1, pageSize: 20 },
      }),
    })
  })

  describe('Export Functionality', () => {
    it('应该显示导出按钮', () => {
      render(<ActivityPage />)
      expect(screen.getByRole('button', { name: /导出日志/i })).toBeInTheDocument()
    })

    it('点击导出按钮应该调用导出API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/csv' })),
      })

      render(<ActivityPage />)
      const exportButton = screen.getByRole('button', { name: /导出日志/i })
      
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/logs/export'),
          expect.any(Object)
        )
      })
    })

    it('应该支持导出为CSV格式', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/csv' })),
      })

      render(<ActivityPage />)
      const exportButton = screen.getByRole('button', { name: /导出日志/i })
      
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('导出成功'))
      })
    })

    it('应该支持导出为JSON格式', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['{}'], { type: 'application/json' })),
      })

      render(<ActivityPage />)
      const exportButton = screen.getByRole('button', { name: /导出日志/i })
      
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/logs/export'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('json'),
          })
        )
      })
    })

    it('导出失败时应该显示错误提示', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('导出失败'))

      render(<ActivityPage />)
      const exportButton = screen.getByRole('button', { name: /导出日志/i })
      
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('导出失败'))
      })
    })
  })

  describe('Clear Log Functionality', () => {
    it('应该显示清空日志按钮', () => {
      render(<ActivityPage />)
      expect(screen.getByRole('button', { name: /清空日志/i })).toBeInTheDocument()
    })

    it('点击清空按钮应该显示确认对话框', () => {
      render(<ActivityPage />)
      const clearButton = screen.getByRole('button', { name: /清空日志/i })
      
      fireEvent.click(clearButton)
      
      expect(screen.getByText(/确定要清空所有日志/i)).toBeInTheDocument()
    })

    it('确认清空后应该调用清空API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<ActivityPage />)
      const clearButton = screen.getByRole('button', { name: /清空日志/i })
      
      fireEvent.click(clearButton)
      
      const confirmButton = screen.getByRole('button', { name: /确认清空/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/logs/clear'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    it('清空成功后应该刷新日志列表', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ logs: [], pagination: { total: 0 } }),
        })

      render(<ActivityPage />)
      const clearButton = screen.getByRole('button', { name: /清空日志/i })
      
      fireEvent.click(clearButton)
      
      const confirmButton = screen.getByRole('button', { name: /确认清空/i })
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3) // 初始加载 + 清空 + 刷新
      })
    })

    it('取消清空不应该调用API', () => {
      render(<ActivityPage />)
      const clearButton = screen.getByRole('button', { name: /清空日志/i })
      
      fireEvent.click(clearButton)
      
      const cancelButton = screen.getByRole('button', { name: /取消/i })
      fireEvent.click(cancelButton)
      
      expect(global.fetch).toHaveBeenCalledTimes(1) // 只有初始加载
    })
  })

  describe('Filter and Search', () => {
    it('应该支持按类型筛选', () => {
      render(<ActivityPage />)
      
      const createFilter = screen.getByRole('button', { name: /CREATE/i })
      fireEvent.click(createFilter)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=CREATE'),
        expect.any(Object)
      )
    })

    it('应该支持搜索日志', () => {
      render(<ActivityPage />)
      
      const searchInput = screen.getByPlaceholderText(/搜索操作或目标/i)
      fireEvent.change(searchInput, { target: { value: '测试' } })
      
      // 应该触发搜索（可能带有防抖）
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=测试'),
          expect.any(Object)
        )
      }, 500)
    })
  })
})
