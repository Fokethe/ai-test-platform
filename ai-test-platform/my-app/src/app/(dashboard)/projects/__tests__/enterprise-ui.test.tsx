import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsPage from '../page';

const mockPush = jest.fn();
const mockSearchParamsGet = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('ProjectsPage', () => {
  const mockProjects = [
    {
      id: '1',
      name: '电商平台',
      description: '核心电商系统测试',
      status: 'ACTIVE',
      createdAt: '2026-03-01T00:00:00Z',
      systemCount: 5,
      testCount: 120,
      memberCount: 8,
      workspaceId: 'ws-1',
    },
    {
      id: '2',
      name: '支付网关',
      description: '支付接口测试项目',
      status: 'ARCHIVED',
      createdAt: '2026-02-15T00:00:00Z',
      systemCount: 3,
      testCount: 80,
      memberCount: 4,
      workspaceId: 'ws-1',
    },
  ];

  const mockWorkspaces = [{ id: 'ws-1', name: '默认工作空间' }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);

    global.fetch = jest.fn((url, init) => {
      if (typeof url === 'string' && url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, data: { list: mockWorkspaces } }),
        });
      }

      if (
        typeof url === 'string' &&
        url.includes('/api/projects') &&
        (!init || !init.method || init.method === 'GET')
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, data: { list: mockProjects } }),
        });
      }

      if (typeof url === 'string' && url.includes('/api/projects') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, data: { id: 'proj-3' } }),
        });
      }

      return Promise.reject(new Error(`Unknown URL: ${String(url)}`));
    }) as unknown as typeof global.fetch;
  });

  it('renders the current project dashboard view', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('电商平台')).toBeInTheDocument();
    });

    expect(screen.getByText('项目管理')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索项目名称或描述')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/workspaces?page=1&pageSize=200',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(screen.getByText('用例: 120')).toBeInTheDocument();
    expect(screen.getByText('成员: 8')).toBeInTheDocument();
  });

  it('shows batch actions after selecting a project', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('电商平台')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText('批量删除')).toBeInTheDocument();
      expect(screen.getByText('已选 1 个')).toBeInTheDocument();
    });
  });

  it('submits workspaceId when creating a project', async () => {
    const user = userEvent.setup();

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('新建项目')).toBeInTheDocument();
    });

    await user.click(screen.getByText('新建项目'));
    await user.type(screen.getByLabelText('项目名称'), '治理项目');
    await user.click(screen.getByRole('button', { name: '创建项目' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '治理项目',
            description: '',
            workspaceId: 'ws-1',
            status: 'ACTIVE',
          }),
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('项目已创建');
    expect(mockPush).toHaveBeenCalledWith('/projects/proj-3');
  });
});
