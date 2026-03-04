/**
 * @jest-environment jsdom
 * TDD Round 4.2 & 4.3: 测试导入导出功能测试
 * 
 * 功能点：
 * 9. 测试导入 - UI上完全未显示导入按钮
 * 10. 测试导出 - UI上完全未显示导出按钮
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

describe('测试导入导出功能', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock SWR data
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          list: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 }
        }
      }),
    })
  })

  describe('导入功能', () => {
    it('应该显示导入按钮', () => {
      render(<TestCenterPage />)
      
      expect(screen.getByTestId('import-button')).toBeInTheDocument()
      expect(screen.getByText('导入')).toBeInTheDocument()
    })

    it('点击导入按钮应显示导入对话框', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('import-button'))
      
      expect(screen.getByText('导入测试用例')).toBeInTheDocument()
      expect(screen.getByText('选择要导入的文件')).toBeInTheDocument()
    })

    it('应该支持 Excel 和 JSON 格式导入', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('import-button'))
      
      expect(screen.getByText('.xlsx')).toBeInTheDocument()
      expect(screen.getByText('.json')).toBeInTheDocument()
      expect(screen.getByText('.csv')).toBeInTheDocument()
    })

    it('选择文件后应显示文件名', async () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('import-button'))
      
      const file = new File(['test'], 'tests.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const input = screen.getByTestId('import-file-input') as HTMLInputElement
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText('tests.xlsx')).toBeInTheDocument()
      })
    })

    it('确认导入应调用API', async () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('import-button'))
      
      const file = new File(['test'], 'tests.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const input = screen.getByTestId('import-file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText('tests.xlsx')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByTestId('confirm-import-button'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tests/import',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })
  })

  describe('导出功能', () => {
    it('应该显示导出按钮', () => {
      render(<TestCenterPage />)
      
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
      expect(screen.getByText('导出')).toBeInTheDocument()
    })

    it('点击导出按钮应显示导出选项菜单', () => {
      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('export-button'))
      
      expect(screen.getByText('导出为 Excel')).toBeInTheDocument()
      expect(screen.getByText('导出为 JSON')).toBeInTheDocument()
      expect(screen.getByText('导出为 CSV')).toBeInTheDocument()
    })

    it('选择导出格式应触发下载', async () => {
      // Mock createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:test')
      global.URL.revokeObjectURL = jest.fn()
      
      // Mock document.createElement for anchor
      const mockClick = jest.fn()
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: jest.fn().mockResolvedValue(new Blob()),
      })

      render(<TestCenterPage />)
      
      fireEvent.click(screen.getByTestId('export-button'))
      fireEvent.click(screen.getByText('导出为 Excel'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tests/export'),
          expect.any(Object)
        )
      })
    })

    it('导出应包含当前筛选条件', async () => {
      global.URL.createObjectURL = jest.fn(() => 'blob:test')
      global.URL.revokeObjectURL = jest.fn()
      
      render(<TestCenterPage />)
      
      // 先搜索
      const searchInput = screen.getByPlaceholderText('搜索测试用例、套件...')
      fireEvent.change(searchInput, { target: { value: '登录测试' } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
      
      fireEvent.click(screen.getByTestId('export-button'))
      fireEvent.click(screen.getByText('导出为 Excel'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=登录测试'),
          expect.any(Object)
        )
      })
    })
  })

  describe('导入导出按钮位置', () => {
    it('导入和导出按钮应在操作栏中', () => {
      render(<TestCenterPage />)
      
      const importButton = screen.getByTestId('import-button')
      const exportButton = screen.getByTestId('export-button')
      
      // 检查它们是否在同一个父容器中
      expect(importButton.parentElement).toBe(exportButton.parentElement)
    })

    it('按钮应显示图标', () => {
      render(<TestCenterPage />)
      
      // 导入按钮应有 Upload 图标
      expect(screen.getByTestId('import-button').querySelector('svg')).toBeInTheDocument()
      // 导出按钮应有 Download 图标  
      expect(screen.getByTestId('export-button').querySelector('svg')).toBeInTheDocument()
    })
  })
})
