/**
 * 需求测试点确认页面测试
 * TDD 第 5 轮：前端 UI 页面
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequirementReviewPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-req-id' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock API 调用
const mockRequirement = {
  id: 'test-req-id',
  title: '用户登录需求',
  type: 'txt',
  filename: 'login.txt',
  content: '用户登录功能，支持手机号+验证码登录',
  features: ['手机号+验证码登录'],
  businessRules: [{ type: 'length', description: '验证码6位', value: '6' }],
  testPoints: [
    { id: 'TP-1', name: '正常登录流程', description: '验证正常登录', priority: 'P0', relatedFeature: '手机号+验证码登录' },
    { id: 'TP-2', name: '验证码错误处理', description: '验证错误验证码', priority: 'P1', relatedFeature: '手机号+验证码登录' },
    { id: 'TP-3', name: '验证码过期处理', description: '验证过期验证码', priority: 'P1', relatedFeature: '手机号+验证码登录' },
  ],
  projectId: 'test-project',
  createdAt: '2024-01-01T00:00:00Z',
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: mockRequirement }),
  })
) as jest.Mock;

describe('RequirementReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该显示需求标题和基本信息', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('用户登录需求')).toBeInTheDocument();
    });

    expect(screen.getByText('login.txt')).toBeInTheDocument();
    expect(screen.getByText('txt')).toBeInTheDocument();
  });

  it('应该显示功能点列表', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('手机号+验证码登录')).toBeInTheDocument();
    });
  });

  it('应该显示业务规则', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('验证码6位')).toBeInTheDocument();
    });
  });

  it('应该显示测试点列表', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('正常登录流程')).toBeInTheDocument();
      expect(screen.getByText('验证码错误处理')).toBeInTheDocument();
      expect(screen.getByText('验证码过期处理')).toBeInTheDocument();
    });
  });

  it('应该显示测试点优先级', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('P0')).toBeInTheDocument();
      expect(screen.getAllByText('P1').length).toBe(2);
    });
  });

  it('应该允许选择/取消选择测试点', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('正常登录流程')).toBeInTheDocument();
    });

    // 找到复选框并点击
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // 默认应该选中
    expect(checkboxes[0]).toBeChecked();

    // 取消选择
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('应该支持全选/全不选', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('正常登录流程')).toBeInTheDocument();
    });

    const selectAllButton = screen.getByText('全选');
    const deselectAllButton = screen.getByText('全不选');

    expect(selectAllButton).toBeInTheDocument();
    expect(deselectAllButton).toBeInTheDocument();

    // 点击全不选
    fireEvent.click(deselectAllButton);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });

    // 点击全选
    fireEvent.click(selectAllButton);

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('应该支持编辑测试点', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('正常登录流程')).toBeInTheDocument();
    });

    // 找到编辑按钮
    const editButtons = screen.getAllByText('编辑');
    expect(editButtons.length).toBeGreaterThan(0);

    // 点击编辑
    fireEvent.click(editButtons[0]);

    // 应该出现编辑表单
    await waitFor(() => {
      expect(screen.getByPlaceholderText('测试点名称')).toBeInTheDocument();
    });
  });

  it('应该支持删除测试点', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('正常登录流程')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // 点击删除
    fireEvent.click(deleteButtons[0]);

    // 应该出现确认对话框
    await waitFor(() => {
      expect(screen.getByText('确认删除')).toBeInTheDocument();
    });
  });

  it('应该支持添加新测试点', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('添加测试点')).toBeInTheDocument();
    });

    const addButton = screen.getByText('添加测试点');
    fireEvent.click(addButton);

    // 应该出现添加表单
    await waitFor(() => {
      expect(screen.getByPlaceholderText('测试点名称')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('描述')).toBeInTheDocument();
    });
  });

  it('应该支持生成用例按钮', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('生成测试用例')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('生成测试用例');
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();
  });

  it('应该显示已选择的测试点数量', async () => {
    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/已选择/)).toBeInTheDocument();
    });

    // 默认应该显示 3/3
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });

  it('应该处理加载状态', () => {
    render(<RequirementReviewPage />);

    // 初始应该显示加载状态
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
  });

  it('应该处理错误状态', async () => {
    // Mock 错误响应
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: '加载失败' }),
      })
    );

    render(<RequirementReviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });
});
