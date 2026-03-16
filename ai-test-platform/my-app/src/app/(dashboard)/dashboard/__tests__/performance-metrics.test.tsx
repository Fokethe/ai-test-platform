import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';

const mockPush = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Dashboard AI Performance Metrics', () => {
  const mockPerformanceData = {
    data: {
      avgGenerationSpeed: 2.5,
      totalTokens: 150000,
      cacheHitRate: 75.5,
      totalCalls: 120,
      avgLatency: 1800,
      costByModel: [
        { model: 'gpt-4', tokens: 100000, cost: 0.5 },
        { model: 'gpt-3.5', tokens: 50000, cost: 0.1 },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/observability/cost')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformanceData),
        });
      }
      if (url.includes('/api/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            code: 0,
            data: {
              stats: {
                totalTestCases: 100,
                todayExecutions: 10,
                passRate: 85,
                failedCount: 5,
                totalExecutions: 200,
                testSuites: 10,
                activeSuites: 8,
              },
              trend: [],
              recentExecutions: [],
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AI performance metrics cards', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('AI生成速度')).toBeInTheDocument();
      expect(screen.getByText('Token消耗')).toBeInTheDocument();
      expect(screen.getByText('缓存命中率')).toBeInTheDocument();
    });
  });

  it('displays correct performance data', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('2.5s')).toBeInTheDocument();
      expect(screen.getByText('150K')).toBeInTheDocument();
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });
  });

  it('fetches observability API on mount', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/observability/cost')
      );
    });
  });

  it('shows loading state initially', () => {
    render(<DashboardPage />);
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles API error gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    ) as unknown as typeof global.fetch;

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('加载失败，请刷新重试')).toBeInTheDocument();
    });
  });
});
