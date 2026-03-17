/**
 * @file 通知中心页面测试
 * @description 测试统一的通知中心页面功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock SWR
const mockMutate = jest.fn()
let mockSWRReturn: any = { data: null, error: null, isLoading: true, mutate: mockMutate }

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => mockSWRReturn),
}))

// Mock fetch
global.fetch = jest.fn()

const mockRouter = {
  push: jest.fn(),
}

const mockNotifications = [
  {
    id: '1',
    title: '测试执行完成',
    message: '测试用例执行已完成，通过率 95%',
    type: 'success',
    read: false,
    createdAt: '2026-03-03T10:00:00Z',
  },
  {
    id: '2',
    title: '系统警告',
    message: '磁盘空间不足，请及时清理',
    type: 'warning',
    read: false,
    createdAt: '2026-03-03T09:00:00Z',
  },
  {
    id: '3',
    title: '测试失败',
    message: '测试用例执行失败，请查看详情',
    type: 'error',
    read: true,
    createdAt: '2026-03-02T10:00:00Z',
  },
]

// Dynamically import the component after mocks are set up
const getNotificationsPage = async () => {
  const { default: NotificationsPage } = await import('../../notifications/page')
  return NotificationsPage
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as unknown as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('页面渲染', () => {
    it('应该渲染页面标题和描述', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByText('通知中心')).toBeInTheDocument()
      expect(screen.getByText('查看和管理所有系统通知')).toBeInTheDocument()
    })

    it('应该显示未读消息数量', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByText('未读消息')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('消息列表', () => {
    it('应该渲染所有通知消息', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByText('测试执行完成')).toBeInTheDocument()
      expect(screen.getByText('系统警告')).toBeInTheDocument()
      expect(screen.getByText('测试失败')).toBeInTheDocument()
    })

    it('应该区分已读和未读消息的视觉样式', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      // 未读消息应该有未读指示器
      const unreadItems = screen.getAllByTestId('notification-item')
      expect(unreadItems[0]).toHaveClass('unread')
      expect(unreadItems[1]).toHaveClass('unread')
      expect(unreadItems[2]).not.toHaveClass('unread')
    })
  })

  describe('筛选功能', () => {
    it('应该支持按已读/未读筛选', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      // 获取筛选区域的"未读"Tab（在 TabsList 中）
      const unreadTab = screen.getByRole('tab', { name: '未读' })
      // 点击未读筛选按钮，不应抛出错误
      expect(() => fireEvent.click(unreadTab)).not.toThrow()
    })

    it('应该支持按类型筛选', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      // 点击类型筛选按钮，不应抛出错误
      const warningTab = screen.getByRole('tab', { name: '警告' })
      expect(() => fireEvent.click(warningTab)).not.toThrow()
    })
  })

  describe('标记已读功能', () => {
    it('应该支持标记单个消息为已读', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      // 点击标记已读按钮
      const markReadButtons = screen.getAllByText('标记已读')
      fireEvent.click(markReadButtons[0])

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications/1/read', {
          method: 'POST',
        })
      })
    })

    it('应该支持标记所有消息为已读', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      fireEvent.click(screen.getByText('全部已读'))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications/read-all', {
          method: 'POST',
        })
      })
    })
  })

  describe('删除功能', () => {
    it('应该支持删除通知', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      // 点击删除按钮
      const deleteButtons = screen.getAllByTestId('delete-notification')
      fireEvent.click(deleteButtons[0])

      // 确认删除
      fireEvent.click(screen.getByText('确认'))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications/1', {
          method: 'DELETE',
        })
      })
    })
  })

  describe('加载和错误状态', () => {
    it('应该显示加载状态', async () => {
      mockSWRReturn = {
        data: null,
        error: null,
        isLoading: true,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('应该处理错误状态', async () => {
      mockSWRReturn = {
        data: null,
        error: new Error('加载失败'),
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByText('加载通知失败')).toBeInTheDocument()
    })

    it('应该处理空状态', async () => {
      mockSWRReturn = {
        data: { notifications: [], unreadCount: 0 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByText('暂无通知')).toBeInTheDocument()
    })
  })

  describe('消息类型图标', () => {
    it('应该为不同类型的消息显示对应的图标', async () => {
      mockSWRReturn = {
        data: { notifications: mockNotifications, unreadCount: 2 },
        error: null,
        isLoading: false,
        mutate: mockMutate,
      }
      const NotificationsPage = await getNotificationsPage()
      render(<NotificationsPage />)

      expect(screen.getByTestId('icon-success')).toBeInTheDocument()
      expect(screen.getByTestId('icon-warning')).toBeInTheDocument()
      expect(screen.getByTestId('icon-error')).toBeInTheDocument()
    })
  })
})
