import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AISettingsPage from '../page';

const mockPush = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test User', role: 'ADMIN' } },
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

describe('AI Settings Observability Tab', () => {
  const mockObservabilityData = {
    data: {
      totalTokens: 150000,
      totalCalls: 120,
      avgLatency: 1800,
      errorRate: 2.5,
      costByModel: [
        { model: 'gpt-4', tokens: 100000, cost: 0.5, calls: 80 },
        { model: 'gpt-3.5', tokens: 50000, cost: 0.1, calls: 40 },
      ],
      dailyStats: [
        { date: '2026-03-01', tokens: 20000, cost: 0.15, calls: 15 },
        { date: '2026-03-02', tokens: 25000, cost: 0.18, calls: 20 },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/settings/ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { model: 'gpt-4o', temperature: 0.7 } }),
        });
      }
      if (url.includes('/api/observability/cost')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockObservabilityData),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders tabs with observability option', async () => {
    render(<AISettingsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('模型配置')).toBeInTheDocument();
      expect(screen.getByText('可观测性')).toBeInTheDocument();
    });
  });

  it('switches to observability tab', async () => {
    render(<AISettingsPage />);

    // Wait for loading to complete and tabs to render
    await waitFor(() => {
      expect(screen.getByText('可观测性')).toBeInTheDocument();
    });

    const observabilityTab = screen.getByText('可观测性');
    fireEvent.click(observabilityTab);

    await waitFor(() => {
      expect(screen.getByText('Token 消耗')).toBeInTheDocument();
      expect(screen.getByText('AI 调用次数')).toBeInTheDocument();
    });
  });

  it('displays correct observability metrics', async () => {
    render(<AISettingsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('可观测性')).toBeInTheDocument();
    });

    const observabilityTab = screen.getByText('可观测性');
    fireEvent.click(observabilityTab);

    await waitFor(() => {
      expect(screen.getByText('150K')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('1.8s')).toBeInTheDocument();
    });
  });

  it('fetches observability data on tab switch', async () => {
    render(<AISettingsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('可观测性')).toBeInTheDocument();
    });

    const observabilityTab = screen.getByText('可观测性');
    fireEvent.click(observabilityTab);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/observability/cost')
      );
    });
  });

  it('allows time range selection', async () => {
    render(<AISettingsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('可观测性')).toBeInTheDocument();
    });

    const observabilityTab = screen.getByText('可观测性');
    fireEvent.click(observabilityTab);

    await waitFor(() => {
      const select = screen.getByLabelText('时间范围');
      fireEvent.change(select, { target: { value: '30' } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=30')
      );
    });
  });
});
