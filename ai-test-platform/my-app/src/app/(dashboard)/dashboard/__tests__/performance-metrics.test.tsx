import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Dashboard RAG Workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn((input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input);

      if (url.startsWith('/api/projects')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              list: [{ id: 'project-a', name: '订单系统' }],
            },
          }),
        } as Response);
      }

      if (url === '/api/knowledge/search') {
        const body = JSON.parse(String(init?.body || '{}'));
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              answer: `这是来自知识库的回答：${body.query || ''}`,
              citations: ['[1] 登录流程规范：SLA 30s'],
              sources: [
                {
                  id: 'doc-1',
                  content: '登录失败重试不超过 3 次，超过后触发风控。',
                  score: 0.91,
                  metadata: {
                    title: '登录流程规范',
                  },
                },
              ],
              context: {
                query: body.query,
                retrievalTime: 18,
                totalTime: 45,
                cacheHit: false,
              },
              generationControl: {
                mode: 'standard',
                iterations: 1,
                confidence: 0.87,
                activeRetrievalTriggered: false,
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

  it('renders rag workspace core layout', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('RAG 检索与智能对话工作台')).toBeInTheDocument();
    expect(screen.getByText('检索设置')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects?page=1&pageSize=200',
        expect.objectContaining({ cache: 'no-store' })
      );
    });
  });

  it('supports quick prompt chips', async () => {
    render(<DashboardPage />);

    const chip = await screen.findByRole('button', {
      name: '总结最近两周登录模块的高风险场景',
    });
    fireEvent.click(chip);

    const composer = screen.getByPlaceholderText(
      '输入问题，回车发送，Shift+Enter 换行'
    );
    expect(composer).toHaveValue('总结最近两周登录模块的高风险场景');
  });

  it('submits query and renders answer with evidence', async () => {
    render(<DashboardPage />);

    const composer = await screen.findByPlaceholderText(
      '输入问题，回车发送，Shift+Enter 换行'
    );
    fireEvent.change(composer, {
      target: { value: '登录失败后系统会如何处理？' },
    });

    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    expect(
      await screen.findByText(
        '这是来自知识库的回答：登录失败后系统会如何处理？'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('[1] 登录流程规范：SLA 30s')).toBeInTheDocument();
    expect(screen.getByText('登录流程规范')).toBeInTheDocument();

    const searchCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[0] === '/api/knowledge/search'
    );
    expect(searchCall).toBeDefined();

    const body = JSON.parse(
      String((searchCall?.[1] as RequestInit | undefined)?.body || '{}')
    );
    expect(body.query).toBe('登录失败后系统会如何处理？');
    expect(body.departmentId).toBe('default');
    expect(body.options.generationMode).toBe('standard');
  });
});
