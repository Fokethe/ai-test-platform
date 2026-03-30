import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user-1' },
    },
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Dashboard Chat Workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn((input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input);

      if (url === '/api/settings/ai') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { model: 'gpt-5.4' } }),
        } as Response);
      }

      if (url.startsWith('/api/chat/conversations?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              list: [
                {
                  id: 'conv-1',
                  title: '默认会话',
                  knowledgeScope: 'all',
                  updatedAt: '2026-03-27T10:00:00.000Z',
                  createdAt: '2026-03-27T10:00:00.000Z',
                },
              ],
            },
          }),
        } as Response);
      }

      if (url.startsWith('/api/chat/conversations/conv-1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              id: 'conv-1',
              title: '默认会话',
              knowledgeScope: 'all',
              projectId: null,
              createdAt: '2026-03-27T10:00:00.000Z',
              updatedAt: '2026-03-27T10:00:00.000Z',
              messages: [],
            },
          }),
        } as Response);
      }

      if (url === '/api/chat/conversations' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              id: 'conv-2',
            },
          }),
        } as Response);
      }

      if (url === '/api/knowledge/ingest') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      }

      if (url === '/api/knowledge/search') {
        const body = JSON.parse(String(init?.body || '{}'));
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              answer: `API answer: ${body.query || ''}`,
              citations: ['[1] citation'],
              sources: [{ id: 'source-1', content: 'source', score: 0.9 }],
              references: [
                {
                  title: 'OpenAI',
                  url: 'https://openai.com',
                  snippet: 'AI reference',
                  provider: 'bing-rss',
                },
              ],
              webSearch: {
                items: [{ title: 'web', snippet: 'result', source: 'web' }],
                provider: 'bing-rss',
                fallbackUsed: false,
              },
              modelRuntime: {
                usedModel: body.model,
                callPath: 'responses',
                apiBacked: true,
              },
            },
          }),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ error: 'NOT_FOUND' }),
      } as Response);
    }) as unknown as typeof global.fetch;
  });

  it('renders rebuilt chat workspace without model settings link', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('个人知识库')).toBeInTheDocument();
    expect(screen.getByText('项目知识库')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新对话/ })).toBeInTheDocument();
    expect(screen.queryByText(/模型设置/)).not.toBeInTheDocument();
  });

  it('sends search request with conversationId and smart web mode', async () => {
    render(<DashboardPage />);

    const composer = await screen.findByPlaceholderText('输入问题，Enter 发送，Shift+Enter 换行');
    fireEvent.change(composer, { target: { value: '登录失败如何处理？' } });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });

    expect(await screen.findByText('API answer: 登录失败如何处理？')).toBeInTheDocument();

    const searchCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[0] === '/api/knowledge/search'
    );
    expect(searchCall).toBeDefined();

    const body = JSON.parse(String((searchCall?.[1] as RequestInit | undefined)?.body || '{}'));
    expect(body.conversationId).toBe('conv-1');
    expect(body.options.webSearchMode).toBe('smart');
    expect(body.options.enableRefinement).toBe(true);
    expect(body.options.enableReranking).toBe(true);
    expect(body.history).toEqual([]);
  });

  it('uploads file and calls knowledge ingest endpoint', async () => {
    const { container } = render(<DashboardPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai', { cache: 'no-store' });
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(['api spec content'], 'api-spec.md', { type: 'text/markdown' });
    Object.defineProperty(file, 'text', {
      value: jest.fn(async () => 'api spec content'),
    });

    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      const ingestCall = (global.fetch as jest.Mock).mock.calls.find(
        (call) => call[0] === '/api/knowledge/ingest'
      );
      expect(ingestCall).toBeDefined();
    });
  });
});
