import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AISettingsPage from '../page';

const mockPush = jest.fn();

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test User', role: 'ADMIN' } },
    status: 'authenticated',
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AI Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url, init) => {
      const u = String(url);
      if (u.includes('/api/settings/ai') && (!init || !init.method || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                model: 'gpt-4o',
                temperature: 0.7,
                apiKey: '',
              },
            }),
        });
      }
      if (u.includes('/api/settings/ai') && init?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 0,
              data: {
                model: 'gpt-4o',
                temperature: 0.7,
                apiKey: 'sk-test-key',
              },
            }),
        });
      }
      if (u.includes('/api/settings/ai/test')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 0, data: { valid: true } }) });
      }
      if (u.includes('/api/observability/cost')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 0,
              data: {
                totalTokens: 150000,
                totalCalls: 120,
                avgLatency: 1800,
                errorRate: 2.5,
                totalCost: 12.34,
                costByModel: [],
                dailyStats: [],
              },
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  it('renders model and observability tabs', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '模型配置' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '可观测' })).toBeInTheDocument();
    });
  });

  it('loads settings on mount', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.some(([url]) => String(url).includes('/api/settings/ai'))).toBe(true);
    });
  });

  it('allows editing api key input', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('API Key');
    fireEvent.change(input, { target: { value: 'sk-test-key' } });
    expect(input).toHaveValue('sk-test-key');
  });

  it('saves settings with PUT request', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test-key' },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(
        calls.some(
          ([url, init]) =>
            String(url).includes('/api/settings/ai') &&
            (init as RequestInit | undefined)?.method === 'PUT'
        )
      ).toBe(true);
    });
  });
});
