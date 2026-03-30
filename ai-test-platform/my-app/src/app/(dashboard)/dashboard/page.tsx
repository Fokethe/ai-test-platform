'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ChatModel = 'gpt-5.3' | 'gpt-5.4' | 'claude-3-7-sonnet' | 'kimi-k2.5';
type WebMode = 'smart' | 'manual' | 'off';
type RagMode = 'standard' | 'enhanced';
type Scope = 'all' | 'personal' | 'project';

type ReferenceItem = {
  title: string;
  url?: string;
  snippet?: string;
  provider?: string;
  sourceType?: string;
};

type MessageMeta = {
  sources: number;
  citations: number;
  web: number;
  provider?: string;
  references?: ReferenceItem[];
  modelRuntime?: {
    usedModel?: string;
    callPath?: string;
    fallbackReason?: string;
  };
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  pending?: boolean;
  error?: boolean;
  meta?: MessageMeta;
};

type Conv = { id: string; title: string; updatedAt: string; knowledgeScope?: Scope };
type FileItem = { id: string; name: string; size: number; content: string };

const MODELS: Array<{ id: ChatModel; label: string }> = [
  { id: 'gpt-5.3', label: 'GPT-5.3' },
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' },
  { id: 'kimi-k2.5', label: 'Kimi K2.5' },
];

const DEPARTMENT_ID = 'default';
const MAX_FILES = 3;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatTime = (v: number) =>
  new Date(v).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

function parseError(payload: unknown, fallback: string) {
  const x = payload as { message?: string; error?: string | { message?: string } } | null;
  return x?.message || (typeof x?.error === 'string' ? x.error : x?.error?.message) || fallback;
}

function parseMessageMeta(meta: string | null | undefined): MessageMeta | undefined {
  if (!meta) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(meta) as MessageMeta;
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function buildReferences(data: {
  references?: unknown[];
  webSearch?: { items?: unknown[]; provider?: string };
}): ReferenceItem[] {
  const notNull = <T,>(value: T | null): value is T => value !== null;

  const directRefs = Array.isArray(data.references)
    ? data.references
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const row = item as Record<string, unknown>;
          return {
            title: typeof row.title === 'string' ? row.title : '未命名来源',
            url: typeof row.url === 'string' ? row.url : undefined,
            snippet: typeof row.snippet === 'string' ? row.snippet : undefined,
            provider: typeof row.provider === 'string' ? row.provider : undefined,
            sourceType: typeof row.sourceType === 'string' ? row.sourceType : undefined,
          } satisfies ReferenceItem;
        })
        .filter(notNull)
    : [];

  if (directRefs.length > 0) {
    return directRefs;
  }

  return Array.isArray(data.webSearch?.items)
    ? data.webSearch.items
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const row = item as Record<string, unknown>;
          return {
            title: typeof row.title === 'string' ? row.title : '网络来源',
            url: typeof row.url === 'string' ? row.url : undefined,
            snippet: typeof row.snippet === 'string' ? row.snippet : undefined,
            provider: data.webSearch?.provider,
            sourceType: 'web',
          } satisfies ReferenceItem;
        })
        .filter(notNull)
    : [];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const search = useSearchParams();
  const projectId = search.get('projectId')?.trim() || '';
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [model, setModel] = useState<ChatModel>('gpt-5.4');
  const [webMode, setWebMode] = useState<WebMode>('smart');
  const [ragMode, setRagMode] = useState<RagMode>('enhanced');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadConversations = async () => {
    const params = new URLSearchParams({ limit: '100' });
    if (projectId) {
      params.set('projectId', projectId);
    }
    const response = await fetch(`/api/chat/conversations?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('加载会话失败');
    }
    const payload = (await response.json()) as { data?: { list?: Conv[] } };
    const rows = Array.isArray(payload.data?.list) ? payload.data.list : [];
    setConversations(rows);
    return rows;
  };

  const openConversation = async (conversationId: string) => {
    setActiveId(conversationId);
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}?limit=300`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('加载会话详情失败');
      }
      const payload = (await response.json()) as {
        data?: {
          knowledgeScope?: Scope;
          messages?: Array<{
            id: string;
            role: 'user' | 'assistant';
            content: string;
            createdAt: string;
            meta?: string;
          }>;
        };
      };
      const detail = payload.data;
      setScope(detail?.knowledgeScope || 'all');
      const rows = Array.isArray(detail?.messages) ? detail.messages : [];
      setMessages(
        rows.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: new Date(item.createdAt).getTime(),
          meta: parseMessageMeta(item.meta),
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载会话详情失败');
      setMessages([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const createConversation = async () => {
    const response = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '新对话',
        knowledgeScope: scope,
        projectId: projectId || undefined,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(parseError(payload, '创建会话失败'));
    }
    const conversationId = (payload as { data?: { id?: string } })?.data?.id || '';
    if (!conversationId) {
      throw new Error('创建会话返回无效');
    }
    setActiveId(conversationId);
    setMessages([]);
    setQuery('');
    setFiles([]);
    await loadConversations();
    return conversationId;
  };

  const ensureConversation = async () => activeId || createConversation();

  const refreshWorkspace = async () => {
    try {
      const rows = await loadConversations();
      if (activeId && rows.some((row) => row.id === activeId)) {
        await openConversation(activeId);
        return;
      }
      if (rows[0]?.id) {
        await openConversation(rows[0].id);
        return;
      }
      await createConversation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新失败');
    }
  };

  const removeConversation = async (conversationId: string) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(parseError(payload, '删除会话失败'));
    }
    const rows = await loadConversations();
    if (activeId === conversationId) {
      if (rows[0]?.id) {
        await openConversation(rows[0].id);
      } else {
        await createConversation();
      }
    }
  };

  const uploadToKnowledge = async (file: File, content: string) => {
    try {
      const response = await fetch('/api/knowledge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: DEPARTMENT_ID,
          projectId: projectId || undefined,
          documents: [
            {
              id: `chat-file-${Date.now()}`,
              content,
              metadata: {
                filename: file.name,
                source: 'dashboard_chat_upload',
              },
            },
          ],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (files.length >= MAX_FILES) {
      toast.error(`最多添加 ${MAX_FILES} 个文件`);
      return;
    }
    setUploading(true);
    try {
      const content = (await file.text()).trim().slice(0, 8000);
      if (!content) {
        toast.error('文件内容为空');
        return;
      }
      setFiles((prev) => [...prev, { id: makeId(), name: file.name, size: file.size, content }]);
      const ok = await uploadToKnowledge(file, content);
      toast.success(ok ? '文件已加入知识检索' : '文件已加入当前对话');
    } catch {
      toast.error('读取文件失败');
    } finally {
      setUploading(false);
    }
  };

  const send = async (forcedText?: string) => {
    const text = (forcedText ?? query).trim();
    if (!text || sending) {
      return;
    }
    const conversationId = await ensureConversation();
    const history = messages
      .filter((message) => !message.pending)
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    const pendingId = makeId();
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: text, createdAt: Date.now() },
      {
        id: pendingId,
        role: 'assistant',
        content: '正在思考...',
        createdAt: Date.now(),
        pending: true,
      },
    ]);
    if (!forcedText) {
      setQuery('');
    }
    setSending(true);
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          departmentId: DEPARTMENT_ID,
          projectId: projectId || undefined,
          conversationId,
          history,
          model,
          attachments: files.map((file) => ({ name: file.name, content: file.content })),
          options: {
            webSearchMode: webMode,
            enableWebSearch: webMode === 'manual',
            enableRefinement: ragMode === 'enhanced',
            enableReranking: ragMode === 'enhanced',
            enableQueryRewrite: true,
            generationMode: 'standard',
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(parseError(payload, '请求失败'));
      }

      const root = payload as {
        success?: boolean;
        data?: {
          answer?: string;
          sources?: unknown[];
          citations?: unknown[];
          references?: unknown[];
          modelRuntime?: { usedModel?: string; callPath?: string; reason?: string };
          webSearch?: {
            items?: unknown[];
            provider?: string;
          };
        };
      };
      if (!root.success || !root.data?.answer) {
        throw new Error('响应格式不正确');
      }

      const references = buildReferences({
        references: root.data.references,
        webSearch: root.data.webSearch,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                content: root.data?.answer || '',
                meta: {
                  sources: Array.isArray(root.data?.sources) ? root.data.sources.length : 0,
                  citations: Array.isArray(root.data?.citations) ? root.data.citations.length : 0,
                  web: Array.isArray(root.data?.webSearch?.items)
                    ? root.data.webSearch.items.length
                    : 0,
                  provider: root.data?.webSearch?.provider,
                  references,
                  modelRuntime: {
                    usedModel: root.data?.modelRuntime?.usedModel,
                    callPath: root.data?.modelRuntime?.callPath,
                    fallbackReason: root.data?.modelRuntime?.reason,
                  },
                },
              }
            : message
        )
      );
      setFiles([]);
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败';
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                pending: false,
                error: true,
                content: `请求失败：${message}`,
              }
            : item
        )
      );
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setBooting(true);
      try {
        const response = await fetch('/api/settings/ai', { cache: 'no-store' });
        if (response.ok) {
          const payload = (await response.json()) as { data?: { model?: ChatModel } };
          if (payload.data?.model) {
            setModel(payload.data.model);
          }
        }

        const rows = await loadConversations();
        if (rows[0]?.id) {
          await openConversation(rows[0].id);
        } else {
          await createConversation();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '初始化失败');
      } finally {
        setBooting(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loadingDetail]);

  const retryFrom = (messageId: string) => {
    const index = messages.findIndex((item) => item.id === messageId);
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') {
        void send(messages[i].content);
        return;
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">
      <aside
        className={cn(
          'h-full border-r border-slate-200 bg-white transition-all',
          collapsed ? 'w-16' : 'w-72'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
          <Button
            type="button"
            size={collapsed ? 'icon' : 'sm'}
            onClick={() => void createConversation()}
            className={cn('h-8', collapsed ? 'w-8' : 'bg-slate-900 text-white hover:bg-slate-800')}
          >
            <MessageSquarePlus className="h-4 w-4" /> {!collapsed ? '新对话' : null}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-y-auto px-2 py-3">
          {!collapsed ? (
            <div className="mb-3 space-y-1">
              <Link
                href={session?.user?.id ? `/knowledge?authorId=${session.user.id}` : '/knowledge'}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                <BookOpen className="h-4 w-4" />
                个人知识库
              </Link>
              <Link
                href={projectId ? `/knowledge?projectId=${projectId}` : '/knowledge'}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                <FileText className="h-4 w-4" />
                项目知识库
              </Link>
              <div className="px-2 pt-1 text-xs text-slate-400">历史会话</div>
            </div>
          ) : null}
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'rounded-lg border px-2 py-2',
                  conversation.id === activeId
                    ? 'border-slate-300 bg-slate-100'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => void openConversation(conversation.id)}
                >
                  {collapsed ? (
                    <span className="text-xs text-slate-500">会话</span>
                  ) : (
                    <>
                      <p className="line-clamp-1 text-sm font-medium text-slate-800">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(conversation.updatedAt).toLocaleString('zh-CN')}
                      </p>
                    </>
                  )}
                </button>
                {!collapsed ? (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
                    onClick={() => void removeConversation(conversation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <div className="text-sm text-slate-500">
            {scope === 'personal'
              ? '当前范围：个人知识'
              : scope === 'project'
                ? '当前范围：项目知识'
                : '当前范围：全局知识'}
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refreshWorkspace()}>
            <RefreshCcw className="h-4 w-4" />
            刷新
          </Button>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-6">
          {booting || loadingDetail ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在加载会话...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium text-slate-800">开始一次对话</p>
                <p className="mt-2 text-sm text-slate-400">直接提问，Enter 发送，Shift+Enter 换行</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn('max-w-[85%]', message.role === 'user' ? '' : 'w-full')}>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 text-sm leading-7',
                        message.role === 'user'
                          ? 'ml-auto bg-slate-900 text-white'
                          : message.error
                            ? 'border border-red-200 bg-red-50 text-red-700'
                            : 'border border-slate-200 bg-white text-slate-900'
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                        <span>{message.role === 'user' ? '你' : '助手'}</span>
                        <span>{formatTime(message.createdAt)}</span>
                        {message.pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'assistant' && !message.pending ? (
                      <div className="mt-2 space-y-2 px-1 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-slate-700"
                            onClick={() => void copyText(message.content)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            复制
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-slate-700"
                            onClick={() => retryFrom(message.id)}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            重试
                          </button>
                          {message.meta ? (
                            <span>
                              来源 {message.meta.sources} · 引用 {message.meta.citations} · 联网{' '}
                              {message.meta.web}
                              {message.meta.provider ? ` · ${message.meta.provider}` : ''}
                              {message.meta.modelRuntime?.usedModel
                                ? ` · ${message.meta.modelRuntime.usedModel}`
                                : ''}
                            </span>
                          ) : null}
                        </div>
                        {message.meta?.references?.length ? (
                          <details className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                            <summary className="cursor-pointer select-none text-slate-600">
                              引用网址（{message.meta.references.length}）
                            </summary>
                            <div className="mt-2 space-y-2">
                              {message.meta.references.map((reference, index) => (
                                <div key={`${reference.url || reference.title}-${index}`} className="space-y-1">
                                  {reference.url ? (
                                    <a
                                      href={reference.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="break-all text-blue-600 hover:underline"
                                    >
                                      {reference.title}
                                    </a>
                                  ) : (
                                    <p className="text-slate-700">{reference.title}</p>
                                  )}
                                  {reference.snippet ? (
                                    <p className="text-slate-500">{reference.snippet}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="mx-auto w-full max-w-4xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" className="hidden" onChange={(event) => void onFile(event)} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                添加文件
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    工具
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>会话配置</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>模型：{MODELS.find((item) => item.id === model)?.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      <DropdownMenuRadioGroup value={model} onValueChange={(value) => setModel(value as ChatModel)}>
                        {MODELS.map((item) => (
                          <DropdownMenuRadioItem key={item.id} value={item.id}>
                            {item.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>RAG：{ragMode === 'enhanced' ? '增强' : '标准'}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-40">
                      <DropdownMenuRadioGroup value={ragMode} onValueChange={(value) => setRagMode(value as RagMode)}>
                        <DropdownMenuRadioItem value="enhanced">增强</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="standard">标准</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      联网：
                      {webMode === 'smart' ? '智能' : webMode === 'manual' ? '手动' : '关闭'}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-40">
                      <DropdownMenuRadioGroup value={webMode} onValueChange={(value) => setWebMode(value as WebMode)}>
                        <DropdownMenuRadioItem value="smart">智能</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="manual">手动</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="off">关闭</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {files.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                  >
                    <span className="max-w-[220px] truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700"
                      onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="relative">
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                rows={3}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                className="resize-none rounded-2xl border-slate-300 pr-14"
              />
              <Button
                type="button"
                size="icon"
                className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-slate-900 hover:bg-slate-800"
                disabled={sending || !query.trim()}
                onClick={() => void send()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
