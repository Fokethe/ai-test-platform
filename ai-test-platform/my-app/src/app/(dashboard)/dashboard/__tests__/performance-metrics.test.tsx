import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard core content after mount', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('欢迎使用 AI 测试平台')).toBeInTheDocument();
      expect(screen.getByText('快速开始')).toBeInTheDocument();
      expect(screen.getByText('数据概览')).toBeInTheDocument();
    });
  });

  it('renders quick start entries', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /新建需求/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /执行测试/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /查看报告/i })).toBeInTheDocument();
      expect(screen.getAllByText('生成用例').length).toBeGreaterThan(0);
    });
  });

  it('supports quick prompt chips', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '生成用例' }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: '生成用例' })[0]);

    const input = screen.getByPlaceholderText('试试输入：生成登录功能的测试用例');
    expect(input).toHaveValue('生成登录功能测试用例');
  });

  it('routes to executions when intent includes 执行', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '发送' })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('试试输入：生成登录功能的测试用例');
    fireEvent.change(input, { target: { value: '执行回归测试' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    expect(mockPush).toHaveBeenCalledWith('/executions');
  });
});
