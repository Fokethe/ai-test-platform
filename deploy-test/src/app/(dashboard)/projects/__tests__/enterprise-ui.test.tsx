import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProjectsPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Projects Enterprise UI', () => {
  const mockProjects = [
    { 
      id: '1', 
      name: '电商平台', 
      description: '核心电商系统测试', 
      status: 'ACTIVE',
      createdAt: '2026-03-01T00:00:00Z',
      _count: { systems: 5, testCases: 120, members: 8 }
    },
    { 
      id: '2', 
      name: '支付网关', 
      description: '支付接口测试项目', 
      status: 'ARCHIVED',
      createdAt: '2026-02-15T00:00:00Z',
      _count: { systems: 3, testCases: 80, members: 4 }
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, data: { list: mockProjects } }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  it('renders enterprise data table', async () => {
    render(<ProjectsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('电商平台')).toBeInTheDocument();
    });

    // Check for table headers
    expect(screen.getByText('项目名称')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('系统数')).toBeInTheDocument();
    expect(screen.getByText('用例数')).toBeInTheDocument();
    expect(screen.getByText('成员数')).toBeInTheDocument();
    expect(screen.getByText('创建时间')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('allows selecting projects via checkboxes', async () => {
    render(<ProjectsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('电商平台')).toBeInTheDocument();
    });

    // Find and click the select all checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    // Click first project checkbox
    fireEvent.click(checkboxes[1]);
  });

  it('shows batch operations when items selected', async () => {
    render(<ProjectsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('电商平台')).toBeInTheDocument();
    });

    // Select a project
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Batch operations should appear
    await waitFor(() => {
      expect(screen.getByText(/批量/)).toBeInTheDocument();
    });
  });
});
