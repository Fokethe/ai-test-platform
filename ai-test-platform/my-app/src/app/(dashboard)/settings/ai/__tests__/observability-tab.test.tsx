import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AISettingsPage from '../page';

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

let mockSearchParamsValue = '';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearchParamsValue),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/components/settings/ai-key-management-panel', () => ({
  AiKeyManagementPanel: () => <div>Mocked Key Panel</div>,
}));

describe('AI Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsValue = '';
    global.fetch = jest.fn((url, init) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/settings/ai/test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, data: { valid: true } }),
        });
      }

      if (requestUrl.includes('/api/settings/ai') && (!init || !init.method || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                model: 'gpt-5.4',
                temperature: 0.7,
                apiKey: '',
                enableAI: true,
                autoGenerate: false,
                smartAnalysis: true,
                maxTokens: 2000,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
              },
            }),
        });
      }

      if (requestUrl.includes('/api/settings/ai') && init?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 0,
              data: {
                model: 'gpt-5.4',
                temperature: 0.7,
                apiKey: 'sk-test-key',
                enableAI: true,
                autoGenerate: false,
                smartAnalysis: true,
                maxTokens: 2000,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
              },
            }),
        });
      }

      if (requestUrl.includes('/api/observability/cost')) {
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

      return Promise.reject(new Error(`Unknown URL: ${requestUrl}`));
    }) as unknown as typeof global.fetch;
  });

  it('renders model and operations tabs', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '模型配置' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '密钥与可观测' })).toBeInTheDocument();
    });
  });

  it('loads settings on mount', async () => {
    render(<AISettingsPage />);

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.some(([url]) => String(url).includes('/api/settings/ai'))).toBe(true);
    });
  });

  it('allows editing fallback api key inside operations tab', async () => {
    mockSearchParamsValue = 'tab=ops';
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('默认兼容密钥')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('默认兼容密钥');
    fireEvent.change(input, { target: { value: 'sk-test-key' } });
    expect(input).toHaveValue('sk-test-key');
  });

  it('saves settings with PUT request', async () => {
    mockSearchParamsValue = 'tab=ops';
    render(<AISettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('默认兼容密钥')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('默认兼容密钥'), {
      target: { value: 'sk-test-key' },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(
        calls.some(
          ([url, requestInit]) =>
            String(url).includes('/api/settings/ai') &&
            (requestInit as RequestInit | undefined)?.method === 'PUT'
        )
      ).toBe(true);
    });
  });
});
