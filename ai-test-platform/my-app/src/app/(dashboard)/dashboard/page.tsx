'use client';

import Link from 'next/link';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  Database,
  FileSearch,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type GenerationMode = 'standard' | 'self-rag' | 'rrr';

type ProjectOption = {
  id: string;
  name: string;
};

type SearchContext = {
  query?: string;
  rewrittenQuery?: string;
  retrievalTime?: number;
  totalTime?: number;
  cacheHit?: boolean;
};

type GenerationControl = {
  mode?: GenerationMode;
  iterations?: number;
  confidence?: number;
  activeRetrievalTriggered?: boolean;
};

type EvidenceSource = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

type MessageReferences = {
  citations: string[];
  sources: EvidenceSource[];
  context?: SearchContext;
  generationControl?: GenerationControl;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  pending?: boolean;
  error?: boolean;
  references?: MessageReferences;
};

type ParsedSearchResult = {
  answer: string;
  references: MessageReferences;
};

const QUICK_PROMPTS = [
  '总结最近两周登录模块的高风险场景',
  '从知识库中找出订单支付失败的回归点',
  '生成“注册流程”测试策略和边界条件',
  '对比接口文档和测试用例，指出缺口',
];

const PROJECT_ALL = '__all_projects__';

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMessageTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
  };

  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    return candidate.error;
  }

  if (candidate.error && typeof candidate.error === 'object') {
    const nestedMessage = (candidate.error as { message?: unknown }).message;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }
  }

  return fallback;
}

function parseProjectOptions(payload: unknown): ProjectOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return [];
  }

  const list = (data as { list?: unknown }).list;
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter(
      (item): item is { id: string; name?: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as { id?: unknown }).id === 'string'
    )
    .map((item) => ({
      id: item.id,
      name:
        typeof item.name === 'string' && item.name.trim().length > 0
          ? item.name
          : item.id,
    }));
}

function parseSearchResult(payload: unknown): ParsedSearchResult | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as { success?: unknown; data?: unknown };
  if (root.success !== true || !root.data || typeof root.data !== 'object') {
    return null;
  }

  const data = root.data as Record<string, unknown>;
  const rawAnswer = data.answer;
  const answer =
    typeof rawAnswer === 'string' && rawAnswer.trim().length > 0
      ? rawAnswer.trim()
      : '检索已完成，但没有返回可展示的文本答案。';

  const citations = Array.isArray(data.citations)
    ? data.citations.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];

  const sources = Array.isArray(data.sources)
    ? data.sources
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object'
        )
        .map((item, index) => ({
          id: typeof item.id === 'string' ? item.id : `source-${index + 1}`,
          content: typeof item.content === 'string' ? item.content : '',
          score: typeof item.score === 'number' ? item.score : 0,
          metadata:
            item.metadata && typeof item.metadata === 'object'
              ? (item.metadata as Record<string, unknown>)
              : undefined,
        }))
    : [];

  let context: SearchContext | undefined;
  if (data.context && typeof data.context === 'object') {
    const contextLike = data.context as Record<string, unknown>;
    context = {
      query:
        typeof contextLike.query === 'string' ? contextLike.query : undefined,
      rewrittenQuery:
        typeof contextLike.rewrittenQuery === 'string'
          ? contextLike.rewrittenQuery
          : undefined,
      retrievalTime:
        typeof contextLike.retrievalTime === 'number'
          ? contextLike.retrievalTime
          : undefined,
      totalTime:
        typeof contextLike.totalTime === 'number'
          ? contextLike.totalTime
          : undefined,
      cacheHit:
        typeof contextLike.cacheHit === 'boolean'
          ? contextLike.cacheHit
          : undefined,
    };
  }

  let generationControl: GenerationControl | undefined;
  if (data.generationControl && typeof data.generationControl === 'object') {
    const generationLike = data.generationControl as Record<string, unknown>;
    generationControl = {
      mode:
        generationLike.mode === 'standard' ||
        generationLike.mode === 'self-rag' ||
        generationLike.mode === 'rrr'
          ? generationLike.mode
          : undefined,
      iterations:
        typeof generationLike.iterations === 'number'
          ? generationLike.iterations
          : undefined,
      confidence:
        typeof generationLike.confidence === 'number'
          ? generationLike.confidence
          : undefined,
      activeRetrievalTriggered:
        typeof generationLike.activeRetrievalTriggered === 'boolean'
          ? generationLike.activeRetrievalTriggered
          : undefined,
    };
  }

  return {
    answer,
    references: {
      citations,
      sources,
      context,
      generationControl,
    },
  };
}

function scoreLabel(score: number) {
  if (!Number.isFinite(score)) {
    return '-';
  }
  const normalized = score <= 1 ? score * 100 : score;
  return `${normalized.toFixed(normalized >= 10 ? 0 : 1)}%`;
}

function sourceTitle(source: EvidenceSource) {
  if (!source.metadata) {
    return source.id;
  }

  const candidates = [
    source.metadata.title,
    source.metadata.name,
    source.metadata.fileName,
    source.metadata.filename,
    source.metadata.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return source.id;
}

type ToggleSettingProps = {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function ToggleSetting({
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleSettingProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function DashboardPage() {
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('default');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [generationMode, setGenerationMode] =
    useState<GenerationMode>('standard');
  const [topK, setTopK] = useState(8);
  const [enableQueryRewrite, setEnableQueryRewrite] = useState(true);
  const [enableSelfRAG, setEnableSelfRAG] = useState(false);
  const [enableMultiSource, setEnableMultiSource] = useState(true);
  const [enableRefinement, setEnableRefinement] = useState(true);
  const [enableReranking, setEnableReranking] = useState(true);
  const [enableActiveRetrieval, setEnableActiveRetrieval] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好，我是 RAG 智能助手。你可以直接提问业务问题、测试问题或缺陷定位问题，我会先检索知识库证据，再给出可追溯答案。',
      createdAt: Date.now(),
    },
  ]);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await fetch('/api/projects?page=1&pageSize=200', {
          cache: 'no-store',
        });
        if (!response.ok) {
          return;
        }
        const payload: unknown = await response.json();
        const nextProjects = parseProjectOptions(payload);
        if (!cancelled) {
          setProjects(nextProjects);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages]);

  const sendQuery = async () => {
    const trimmed = query.trim();
    if (!trimmed || isSending) {
      return;
    }

    const trimmedDepartment = departmentId.trim();
    if (!trimmedDepartment) {
      toast.error('请先填写 departmentId');
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const pendingMessageId = createMessageId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: pendingMessageId,
        role: 'assistant',
        content: '正在检索知识库并整理答案，请稍候...',
        createdAt: Date.now(),
        pending: true,
      },
    ]);
    setQuery('');
    setIsSending(true);

    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmed,
          departmentId: trimmedDepartment,
          ...(projectId ? { projectId } : {}),
          options: {
            topK,
            enableQueryRewrite,
            enableSelfRAG,
            enableMultiSource,
            enableRefinement,
            enableReranking,
            enableActiveRetrieval,
            generationMode,
          },
        }),
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '检索请求失败'));
      }

      const result = parseSearchResult(payload);
      if (!result) {
        throw new Error('接口返回格式不符合预期');
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingMessageId
            ? {
                ...item,
                pending: false,
                content: result.answer,
                references: result.references,
              }
            : item
        )
      );
      toast.success('RAG 检索完成');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '检索时发生未知错误';
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingMessageId
            ? {
                ...item,
                pending: false,
                error: true,
                content: `检索失败：${message}`,
              }
            : item
        )
      );
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendQuery();
    }
  };

  let latestReferences: MessageReferences | null = null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const current = messages[index];
    if (current.role === 'assistant' && current.references) {
      latestReferences = current.references;
      break;
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-blue-50 p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs text-cyan-700">
            <Sparkles className="h-3.5 w-3.5" />
            RAG 工作台
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              RAG 检索与智能对话工作台
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              类似飞书知识问答体验：左侧连续对话，右侧可控检索策略和证据追踪，方便团队把回答直接用于测试设计与问题定位。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">
              智能问答
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              检索增强生成
            </Badge>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              可追溯证据
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-[var(--electric)]" />
              智能对话
            </CardTitle>
            <CardDescription>
              每次回答都会携带来源证据，适合用于测试点梳理、缺陷分析、需求对齐。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={messageListRef}
              className="h-[52vh] min-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl border px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'border-[var(--electric)]/40 bg-[var(--electric)]/10 text-slate-900'
                        : message.error
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                      <Badge
                        variant="outline"
                        className={
                          message.role === 'user'
                            ? 'border-[var(--electric)]/40 text-[var(--electric)]'
                            : ''
                        }
                      >
                        {message.role === 'user' ? '你' : 'RAG 助手'}
                      </Badge>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                    {message.role === 'assistant' && message.references ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>引用 {message.references.citations.length} 条</span>
                        <span>证据 {message.references.sources.length} 条</span>
                        {message.references.generationControl?.mode ? (
                          <span>
                            模式 {message.references.generationControl.mode}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuery();
              }}
            >
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="输入问题，回车发送，Shift+Enter 换行"
                rows={3}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  建议：问题里带上模块名、业务场景和目标，可提升检索精度。
                </p>
                <Button
                  type="submit"
                  className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
                  disabled={isSending || !query.trim()}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      检索中...
                    </>
                  ) : (
                    <>
                      发送
                      <ArrowUp className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="h-4 w-4 text-cyan-600" />
                检索设置
              </CardTitle>
              <CardDescription>
                控制召回、重排和生成模式，快速切换不同 RAG 策略。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  departmentId
                </label>
                <Input
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  placeholder="default"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  项目范围
                </label>
                <Select
                  value={projectId || PROJECT_ALL}
                  onValueChange={(value) =>
                    setProjectId(value === PROJECT_ALL ? '' : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="全部项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROJECT_ALL}>全部项目</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingProjects ? (
                  <p className="text-xs text-slate-500">正在加载项目...</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    生成模式
                  </label>
                  <Select
                    value={generationMode}
                    onValueChange={(value) =>
                      setGenerationMode(value as GenerationMode)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">standard</SelectItem>
                      <SelectItem value="self-rag">self-rag</SelectItem>
                      <SelectItem value="rrr">rrr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    TopK
                  </label>
                  <Select
                    value={String(topK)}
                    onValueChange={(value) => setTopK(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <ToggleSetting
                  label="Query Rewrite"
                  description="改写查询提升召回命中率"
                  checked={enableQueryRewrite}
                  onCheckedChange={setEnableQueryRewrite}
                />
                <ToggleSetting
                  label="Self-RAG"
                  description="让生成阶段触发自反思"
                  checked={enableSelfRAG}
                  onCheckedChange={setEnableSelfRAG}
                />
                <ToggleSetting
                  label="Multi-Source"
                  description="融合多源检索结果"
                  checked={enableMultiSource}
                  onCheckedChange={setEnableMultiSource}
                />
                <ToggleSetting
                  label="Refinement + Reranking"
                  description="先精炼再重排，提升证据质量"
                  checked={enableRefinement && enableReranking}
                  onCheckedChange={(checked) => {
                    setEnableRefinement(checked);
                    setEnableReranking(checked);
                  }}
                />
                <ToggleSetting
                  label="Active Retrieval"
                  description="生成时触发追加检索"
                  checked={enableActiveRetrieval}
                  onCheckedChange={setEnableActiveRetrieval}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" asChild>
                  <Link href="/knowledge">管理知识库</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/ai-generate/requirements/upload">
                    上传需求文档
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings/ai">AI 模型设置</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-emerald-600" />
                检索证据
              </CardTitle>
              <CardDescription>
                最近一次回答的引用、来源和检索上下文
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!latestReferences ? (
                <p className="text-sm text-slate-500">
                  发送问题后，这里会显示引用证据与检索路径。
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {latestReferences.context?.retrievalTime !== undefined ? (
                      <Badge variant="outline">
                        检索耗时 {latestReferences.context.retrievalTime}ms
                      </Badge>
                    ) : null}
                    {latestReferences.context?.totalTime !== undefined ? (
                      <Badge variant="outline">
                        总耗时 {latestReferences.context.totalTime}ms
                      </Badge>
                    ) : null}
                    {latestReferences.context?.cacheHit !== undefined ? (
                      <Badge variant="outline">
                        缓存命中{' '}
                        {latestReferences.context.cacheHit ? '是' : '否'}
                      </Badge>
                    ) : null}
                    {latestReferences.generationControl?.iterations !==
                    undefined ? (
                      <Badge variant="outline">
                        迭代 {latestReferences.generationControl.iterations} 次
                      </Badge>
                    ) : null}
                  </div>

                  {latestReferences.citations.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        引用
                      </p>
                      <div className="space-y-2">
                        {latestReferences.citations.map((citation) => (
                          <div
                            key={citation}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700"
                          >
                            {citation}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {latestReferences.sources.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        来源片段
                      </p>
                      <div className="space-y-2">
                        {latestReferences.sources.slice(0, 6).map((source) => (
                          <div
                            key={source.id}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium text-slate-800">
                                {sourceTitle(source)}
                              </p>
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-700"
                              >
                                {scoreLabel(source.score)}
                              </Badge>
                            </div>
                            <p className="line-clamp-3 text-xs leading-5 text-slate-600">
                              {source.content || '无文本片段'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
