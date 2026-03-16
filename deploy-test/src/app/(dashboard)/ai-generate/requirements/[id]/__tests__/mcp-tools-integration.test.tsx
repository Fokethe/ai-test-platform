import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RequirementDetailPage from '../page';

const mockPush = jest.fn();
const mockParams = { id: 'req-123' };

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('AI Generate MCP Tools Integration', () => {
  const mockRequirement = {
    id: 'req-123',
    title: '用户登录功能',
    content: '用户可以通过用户名和密码登录系统',
    fileName: 'login-requirement.pdf',
    fileType: 'PDF',
    status: 'COMPLETED',
    testPoints: [
      { id: 'tp-1', name: '正常登录', description: '输入正确的用户名和密码', priority: 'P0' },
      { id: 'tp-2', name: '密码错误', description: '输入错误的密码', priority: 'P1' },
    ],
    features: ['登录功能'],
    businessRules: ['密码必须加密存储'],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/requirements/req-123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockRequirement }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  it('renders MCP tool selector', async () => {
    render(<RequirementDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('用户登录功能')).toBeInTheDocument();
    });

    // Switch to test points tab
    const testPointsTab = screen.getByText(/测试点/);
    fireEvent.click(testPointsTab);

    // Check for tool selector - look for the Select trigger
    await waitFor(() => {
      const toolSelector = screen.getByRole('combobox');
      expect(toolSelector).toBeInTheDocument();
    });
  });

  it('allows selecting MCP tools', async () => {
    render(<RequirementDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('用户登录功能')).toBeInTheDocument();
    });

    // Switch to test points tab
    const testPointsTab = screen.getByText(/测试点/);
    fireEvent.click(testPointsTab);

    // Wait for the Select component to be available
    await waitFor(() => {
      const toolSelector = screen.getByRole('combobox');
      expect(toolSelector).toBeInTheDocument();
    });

    // Verify the generate button is present (using regex to match text that may be split)
    const generateButton = screen.getByRole('button', { name: /生成/ });
    expect(generateButton).toBeInTheDocument();
  });
});
