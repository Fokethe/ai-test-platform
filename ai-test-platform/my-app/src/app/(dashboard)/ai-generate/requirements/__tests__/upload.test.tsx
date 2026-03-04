/**
 * @jest-environment jsdom
 * TDD Round 4.1: AI文档上传UI测试
 * 测试需求文档上传功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import RequirementUploadPage from '../page'

// Mock Next.js navigation
const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
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

describe('AI文档上传UI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该渲染上传页面标题和描述', () => {
    render(<RequirementUploadPage />)
    
    expect(screen.getByText('需求文档上传')).toBeInTheDocument()
    expect(screen.getByText('上传需求文档，AI自动解析生成测试点')).toBeInTheDocument()
  })

  it('应该显示文件上传区域', () => {
    render(<RequirementUploadPage />)
    
    expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument()
    expect(screen.getByText('点击或拖拽文件到此处')).toBeInTheDocument()
    expect(screen.getByText('支持 PDF、Word、Markdown 格式')).toBeInTheDocument()
  })

  it('应该显示项目选择下拉框', () => {
    render(<RequirementUploadPage />)
    
    expect(screen.getByLabelText('选择项目')).toBeInTheDocument()
  })

  it('应该显示支持的文件格式标签', () => {
    render(<RequirementUploadPage />)
    
    expect(screen.getByText('.pdf')).toBeInTheDocument()
    expect(screen.getByText('.docx')).toBeInTheDocument()
    expect(screen.getByText('.md')).toBeInTheDocument()
    expect(screen.getByText('.txt')).toBeInTheDocument()
  })

  it('上传按钮在未选择文件时应禁用', () => {
    render(<RequirementUploadPage />)
    
    const uploadButton = screen.getByTestId('upload-button')
    expect(uploadButton).toBeDisabled()
  })

  it('选择文件后应显示文件名', async () => {
    render(<RequirementUploadPage />)
    
    const file = new File(['test content'], 'test-requirement.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input') as HTMLInputElement
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('test-requirement.pdf')).toBeInTheDocument()
    })
  })

  it('选择文件后上传按钮应启用', async () => {
    render(<RequirementUploadPage />)
    
    const file = new File(['test content'], 'test-requirement.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-button')).not.toBeDisabled()
    })
  })

  it('点击上传应调用API并跳转', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'req-123',
        title: 'Test Requirement',
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    render(<RequirementUploadPage />)
    
    const file = new File(['test content'], 'test-requirement.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByTestId('upload-button'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/requirements/upload',
        expect.any(Object)
      )
    })
  })

  it('上传失败时应显示错误提示', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('上传失败'))

    render(<RequirementUploadPage />)
    
    const file = new File(['test content'], 'test-requirement.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByTestId('upload-button'))
    
    await waitFor(() => {
      expect(screen.getByText('上传失败')).toBeInTheDocument()
    })
  })

  it('应支持拖拽上传', () => {
    render(<RequirementUploadPage />)
    
    const dropZone = screen.getByTestId('file-upload-zone')
    
    const file = new File(['test content'], 'test-requirement.pdf', { type: 'application/pdf' })
    
    fireEvent.dragOver(dropZone)
    expect(dropZone).toHaveClass('border-blue-500')
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })
    
    expect(screen.getByText('test-requirement.pdf')).toBeInTheDocument()
  })

  it('应显示文件大小限制提示', () => {
    render(<RequirementUploadPage />)
    
    expect(screen.getByText('最大支持 10MB')).toBeInTheDocument()
  })
})
