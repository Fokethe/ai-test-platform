import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { decryptText } from '@/lib/security/simple-crypto';
import { createAIClient } from '@/lib/ai/utils';
import { getRAGService } from '@/lib/ai/rag/rag-service';
import {
  QueryCandidate,
  QueryPlan,
  SourceExecutionResult,
  executeMultiSourceQuery,
} from '@/lib/ai/rag/multi-source-query';
import {
  DEFAULT_ROUTING_SOURCES,
  evaluateRoutingRules,
  getLatestRoutingRuleSet,
  parseRoutingRules,
} from '@/lib/ai/rag/logic-routing';
import {
  getActivePromptTemplates,
  selectPromptTemplate,
} from '@/lib/ai/rag/semantic-routing';
import { resolveRagStrategyConfig } from '@/lib/ai/rag/strategy-config';
import {
  refineRetrievalEvidence,
  RefinedEvidence,
} from '@/lib/ai/rag/retrieval-refinement';
import { rerankEvidence } from '@/lib/ai/rag/reranking-service';
import {
  ControlledGenerationMode,
  ControlledGenerationResult,
  runControlledGeneration,
} from '@/lib/ai/rag/controlled-generation';

const CHAT_MODEL_IDS = ['gpt-5.3', 'gpt-5.4', 'claude-3-7-sonnet', 'kimi-k2.5'] as const;
const DEFAULT_CHAT_MODEL = 'gpt-5.4';
const chatModelSchema = z.enum(CHAT_MODEL_IDS);
const historyItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'history content is required').max(4000, 'history content is too long'),
});
const attachmentSchema = z.object({
  name: z.string().min(1, 'attachment name is required').max(200, 'attachment name is too long'),
  content: z
    .string()
    .min(1, 'attachment content is required')
    .max(20000, 'attachment content is too long'),
});

const searchSchema = z.object({
  query: z.string().min(1, 'query is required').max(1000, 'query is too long'),
  departmentId: z.string().min(1, 'departmentId is required'),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  history: z.array(historyItemSchema).max(12).optional(),
  model: chatModelSchema.optional(),
  attachments: z.array(attachmentSchema).max(3).optional(),
  options: z
    .object({
      topK: z.number().int().min(1).max(50).optional(),
      enableHyDE: z.boolean().optional(),
      enableQueryRewrite: z.boolean().optional(),
      enableSelfRAG: z.boolean().optional(),
      enableMultiSource: z.boolean().optional(),
      enableMultiQuery: z.boolean().optional(),
      enableDecomposition: z.boolean().optional(),
      enableFusion: z.boolean().optional(),
      enableRefinement: z.boolean().optional(),
      enableReranking: z.boolean().optional(),
      enableActiveRetrieval: z.boolean().optional(),
      enableWebSearch: z.boolean().optional(),
      webSearchMode: z.enum(['smart', 'manual', 'off']).optional(),
      generationMode: z.enum(['standard', 'self-rag', 'rrr']).optional(),
      maxGenerationIterations: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});

type MultiSourceSummary = {
  queryVariants: string[];
  plans: QueryPlan[];
  sourceResults: SourceExecutionResult[];
  mergedCandidates: QueryCandidate[];
  failedSources: Array<{ source: string; error: string }>;
};

type RAGQuerySummary = {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  citations: string[];
  context: {
    query: string;
    rewrittenQuery?: string;
    retrievalTime: number;
    cacheHit: boolean;
  };
  selfRAGResult?: {
    reflections: string[];
    citations: string[];
  };
};

type SearchAttachment = z.infer<typeof attachmentSchema>;
type SearchHistoryItem = z.infer<typeof historyItemSchema>;
type WebSearchMode = 'smart' | 'manual' | 'off';
type WebSearchProvider = 'bing-rss' | 'bing-jina' | 'duckduckgo';

type WebSearchItem = {
  title: string;
  snippet: string;
  url?: string;
  source: 'web';
};

type WebSearchResult = {
  enabled: boolean;
  mode: WebSearchMode;
  items: WebSearchItem[];
  provider?: WebSearchProvider;
  fallbackUsed?: boolean;
  error?: string;
  reason?: string;
};

type RuntimeSource = 'request' | 'user_setting' | 'default';

type RuntimeModelMeta = {
  requestedModel: string;
  usedModel: string;
  provider: string;
  source: RuntimeSource;
  apiBacked: boolean;
  callPath: 'responses' | 'chat.completions' | 'controlled';
  usage?: {
    requestTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
  apiKeyId?: string | null;
  baseUrl?: string;
  reason?: string;
};

type ResolvedAiRuntimeConfig = {
  model: string;
  apiKey: string;
  apiKeyId?: string | null;
  provider: string;
  baseUrl: string;
  enableAI: boolean;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  source: RuntimeSource;
};

type ModelAnswerResult = {
  text: string;
  callPath: 'responses' | 'chat.completions';
  usage?: {
    requestTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
};

const MODEL_PROVIDER_MAP: Record<string, string> = {
  'gpt-5.3': 'openai-compatible',
  'gpt-5.4': 'openai-compatible',
  'claude-3-7-sonnet': 'anthropic',
  'kimi-k2.5': 'kimi',
};

const MODEL_COST_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-5.3': { input: 0.01, output: 0.03 },
  'gpt-5.4': { input: 0.012, output: 0.036 },
  'claude-3-7-sonnet': { input: 0.003, output: 0.015 },
  'kimi-k2.5': { input: 0.001, output: 0.002 },
};

function trimContent(content: string, maxLength = 500): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}...`;
}

function estimateTokens(text: string) {
  return Math.max(0, Math.ceil(text.length / 4));
}

function trimByTokenBudget(content: string, maxTokens: number) {
  const maxChars = Math.max(200, maxTokens * 4);
  if (content.length <= maxChars) {
    return content;
  }
  return `${content.slice(0, maxChars)}...`;
}

function buildReferencesFromWebSearch(items: WebSearchItem[], provider?: string) {
  const seen = new Set<string>();
  return items
    .map((item) => ({
      title: item.title || '网络来源',
      url: item.url,
      snippet: item.snippet,
      provider,
      sourceType: 'web',
    }))
    .filter((item) => {
      const key = `${item.url || ''}|${item.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function calculateEstimatedCost(model: string, usage?: {
  requestTokens: number;
  responseTokens: number;
}) {
  if (!usage) {
    return 0;
  }
  const pricing = MODEL_COST_PER_1K[model];
  if (!pricing) {
    return 0;
  }
  const inputCost = (usage.requestTokens / 1000) * pricing.input;
  const outputCost = (usage.responseTokens / 1000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

async function recordModelCallStat(input: {
  userId: string;
  conversationId?: string;
  apiKeyId?: string | null;
  model: string;
  provider: string;
  callPath: string;
  usage?: {
    requestTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  webEnabled: boolean;
  success: boolean;
  fallbackReason?: string;
}) {
  const statModel = (prisma as any).aiModelCallStat;
  if (!statModel?.create) {
    return;
  }

  await statModel.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId || null,
      apiKeyId: input.apiKeyId || null,
      model: input.model,
      provider: input.provider,
      callPath: input.callPath,
      requestTokens: input.usage?.requestTokens || 0,
      responseTokens: input.usage?.responseTokens || 0,
      totalTokens: input.usage?.totalTokens || 0,
      estimatedCost: calculateEstimatedCost(input.model, input.usage),
      latencyMs: input.latencyMs,
      webEnabled: input.webEnabled,
      success: input.success,
      fallbackReason: input.fallbackReason || null,
    },
  });
}

function dedupeText(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function normalizeHistory(history: SearchHistoryItem[] | undefined, maxTurns = 8): SearchHistoryItem[] {
  if (!history || history.length === 0) {
    return [];
  }
  return history
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-maxTurns);
}

function isLikelyFollowupQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return false;
  }
  return /^(它|这个|那|上述|上面|继续|然后|再|补充|that|it|then|continue|what about|how about)/i.test(
    trimmed
  );
}

function buildContextualQuery(query: string, history: SearchHistoryItem[]): string {
  if (history.length === 0 || !isLikelyFollowupQuery(query)) {
    return query;
  }

  const contextText = history
    .slice(-4)
    .map((item) => `${item.role === 'user' ? '用户' : '助手'}: ${trimContent(item.content, 220)}`)
    .join('\n');

  return `${query}\n\n[会话上下文]\n${contextText}`;
}

function buildWebSearchQuery(query: string, history: SearchHistoryItem[]): string {
  if (history.length === 0 || !isLikelyFollowupQuery(query)) {
    return query;
  }

  const recentContext = history
    .slice(-4)
    .map((item) => trimContent(item.content.replace(/\s+/g, ' ').trim(), 120))
    .filter(Boolean);

  return trimContent(dedupeText([...recentContext, query]).join(' '), 320);
}

function buildQueryVariants(
  query: string,
  toggles: { multiQuery: boolean; decomposition: boolean }
): string[] {
  const variants: string[] = [query];

  if (toggles.multiQuery) {
    variants.push(`${query} test scenario`);
    variants.push(`${query} edge case`);
  }

  if (toggles.decomposition) {
    const splitByPunctuation = query
      .split(/[,.;!?，。；！？、]/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
    variants.push(...splitByPunctuation);
  }

  return dedupeText(variants).slice(0, 4);
}

function mergeCandidates(candidates: QueryCandidate[], topK: number): QueryCandidate[] {
  const map = new Map<string, QueryCandidate>();
  for (const item of candidates) {
    const existing = map.get(item.id);
    if (!existing || item.score > existing.score) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function toFailedSources(sourceResults: SourceExecutionResult[]) {
  return sourceResults
    .filter((item) => !item.success)
    .map((item) => ({
      source: item.source,
      error: item.error || 'UNKNOWN_ERROR',
    }));
}

function withVariantTag(
  result: Awaited<ReturnType<typeof executeMultiSourceQuery>>,
  variant: string
): { plans: QueryPlan[]; sourceResults: SourceExecutionResult[]; mergedCandidates: QueryCandidate[] } {
  const plans = result.plans.map((plan) => ({
    ...plan,
    params: {
      ...plan.params,
      queryVariant: variant,
    },
  }));

  const sourceResults = result.sourceResults.map((item) => ({
    ...item,
    plan: {
      ...item.plan,
      params: {
        ...item.plan.params,
        queryVariant: variant,
      },
    },
  }));

  const mergedCandidates = result.mergedCandidates.map((item) => ({
    ...item,
    metadata: {
      ...(item.metadata || {}),
      queryVariant: variant,
    },
  }));

  return {
    plans,
    sourceResults,
    mergedCandidates,
  };
}

function mapRagSourcesToCandidates(
  sources: Array<{ id: string; content: string; score: number; metadata?: Record<string, unknown> }>
): QueryCandidate[] {
  return sources.map((source, index) => ({
    id: source.id,
    title: `rag-source-${index + 1}`,
    snippet: trimContent(source.content, 180),
    score: source.score,
    source: 'vector',
    metadata: source.metadata,
  }));
}

function toDefaultRefinedEvidence(candidates: QueryCandidate[], topK: number): RefinedEvidence[] {
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((candidate) => ({
      ...candidate,
      refinedScore: candidate.score,
      reasonSummary: `baseline source=${candidate.source} score=${candidate.score.toFixed(2)}`,
    }));
}

async function resolveAccessibleProjectIds(
  userId: string,
  explicitProjectId?: string
): Promise<{ projectIds: string[]; forbidden: boolean }> {
  if (explicitProjectId) {
    const allowed = await hasProjectAccess(userId, explicitProjectId);
    return {
      projectIds: allowed ? [explicitProjectId] : [],
      forbidden: !allowed,
    };
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
    select: { id: true },
  });

  return {
    projectIds: projects.map((item) => item.id),
    forbidden: false,
  };
}

async function logMultiSourceFailures(input: {
  actorId: string;
  query: string;
  explicitProjectId?: string;
  projectIds: string[];
  failedSources: Array<{ source: string; error: string }>;
}) {
  if (input.failedSources.length === 0) {
    return;
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: 'MULTI_SOURCE_QUERY_PARTIAL_FAILURE',
    target: 'KNOWLEDGE_SEARCH',
    targetId: input.explicitProjectId || 'multi-project-scope',
    projectId:
      input.explicitProjectId || (input.projectIds.length === 1 ? input.projectIds[0] : undefined),
    metadata: {
      queryPreview: input.query.slice(0, 120),
      failedSources: input.failedSources,
      projectScopeCount: input.projectIds.length,
    },
  });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'UNKNOWN_RAG_ERROR';
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (entity: string, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    })
    .replace(/&#(\d+);/g, (entity: string, value: string) => {
      const code = Number.parseInt(value, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractXmlTag(block: string, tag: string): string {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const matched = pattern.exec(block);
  if (!matched?.[1]) {
    return '';
  }
  return decodeXmlEntities(matched[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim();
}

function parseBingRssItems(xmlText: string): WebSearchItem[] {
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const items: WebSearchItem[] = [];
  for (const block of itemBlocks) {
    const title = extractXmlTag(block, 'title');
    const snippet = extractXmlTag(block, 'description');
    const url = extractXmlTag(block, 'link');
    if (!title || !snippet) {
      continue;
    }
    items.push({
      title: trimContent(title, 120),
      snippet: trimContent(snippet, 240),
      url: url || undefined,
      source: 'web',
    });
  }
  return items;
}

async function fetchBingRssItems(query: string): Promise<{ items: WebSearchItem[]; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      },
      10000
    );

    if (!response.ok) {
      return {
        items: [],
        error: `WEB_SEARCH_HTTP_${response.status}`,
      };
    }

    const xmlText = await response.text();
    return {
      items: parseBingRssItems(xmlText).slice(0, 5),
    };
  } catch (error) {
    return {
      items: [],
      error: toErrorMessage(error),
    };
  }
}

function parseBingJinaItems(markdown: string): WebSearchItem[] {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const items: WebSearchItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matched = /^##\s+\[(.+?)\]\((https?:\/\/[^)]+)\)/.exec(line);
    if (!matched) {
      continue;
    }

    let snippet = '';
    for (let cursor = index + 1; cursor < Math.min(index + 8, lines.length); cursor += 1) {
      const candidate = lines[cursor];
      if (!candidate) {
        continue;
      }
      if (
        candidate.startsWith('## ') ||
        candidate.startsWith('*') ||
        candidate.startsWith('![') ||
        candidate.startsWith('[')
      ) {
        continue;
      }
      snippet = candidate;
      break;
    }

    if (!snippet) {
      snippet = '搜索结果摘要';
    }

    items.push({
      title: trimContent(matched[1], 120),
      url: matched[2],
      snippet: trimContent(snippet, 240),
      source: 'web',
    });
  }

  return items;
}

async function fetchBingJinaItems(query: string): Promise<{ items: WebSearchItem[]; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'text/plain' },
      },
      12000
    );

    if (!response.ok) {
      return {
        items: [],
        error: `WEB_SEARCH_HTTP_${response.status}`,
      };
    }

    const text = await response.text();
    return {
      items: parseBingJinaItems(text).slice(0, 5),
    };
  } catch (error) {
    return {
      items: [],
      error: toErrorMessage(error),
    };
  }
}

function parseDuckDuckGoTopics(input: unknown): WebSearchItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const items: WebSearchItem[] = [];
  for (const topic of input) {
    if (!topic || typeof topic !== 'object') {
      continue;
    }

    const entry = topic as {
      Text?: unknown;
      FirstURL?: unknown;
      Name?: unknown;
      Topics?: unknown;
    };

    if (typeof entry.Text === 'string' && entry.Text.trim()) {
      items.push({
        title:
          typeof entry.Name === 'string' && entry.Name.trim()
            ? entry.Name
            : entry.Text.slice(0, 80),
        snippet: trimContent(entry.Text, 240),
        url: typeof entry.FirstURL === 'string' ? entry.FirstURL : undefined,
        source: 'web',
      });
    }

    if (Array.isArray(entry.Topics)) {
      items.push(...parseDuckDuckGoTopics(entry.Topics));
    }
  }

  return items;
}

function dedupeWebSearchItems(items: WebSearchItem[]): WebSearchItem[] {
  const seen = new Set<string>();
  const result: WebSearchItem[] = [];

  for (const item of items) {
    const key = `${item.url || ''}|${item.title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function fetchWebSearchItems(query: string): Promise<{
  items: WebSearchItem[];
  error?: string;
}> {
  try {
    const response = await fetchWithTimeout(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }
      ,
      10000
    );

    if (!response.ok) {
      return {
        items: [],
        error: `WEB_SEARCH_HTTP_${response.status}`,
      };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const root = (payload || {}) as {
      Heading?: unknown;
      AbstractText?: unknown;
      AbstractURL?: unknown;
      RelatedTopics?: unknown;
    };

    const items: WebSearchItem[] = [];
    if (typeof root.AbstractText === 'string' && root.AbstractText.trim()) {
      items.push({
        title:
          typeof root.Heading === 'string' && root.Heading.trim()
            ? root.Heading
            : 'DuckDuckGo',
        snippet: trimContent(root.AbstractText, 240),
        url: typeof root.AbstractURL === 'string' ? root.AbstractURL : undefined,
        source: 'web',
      });
    }

    items.push(...parseDuckDuckGoTopics(root.RelatedTopics));
    return {
      items: dedupeWebSearchItems(items).slice(0, 5),
    };
  } catch (error) {
    return {
      items: [],
      error: toErrorMessage(error),
    };
  }
}

function shouldTriggerSmartWebSearch(input: {
  query: string;
  ragResult: RAGQuerySummary;
  fallback?: {
    enabled: boolean;
    reason: string;
  };
}) {
  if (input.fallback?.enabled) {
    return { run: true, reason: 'RAG_FALLBACK' };
  }

  const lower = input.query.toLowerCase();
  const isTimeSensitive =
    /(最新|今日|今天|近期|刚刚|新闻|价格|汇率|版本|更新|latest|today|now|news|price|rate|release)/i.test(
      lower
    );
  if (isTimeSensitive) {
    return { run: true, reason: 'TIME_SENSITIVE_QUERY' };
  }

  const sourceCount = input.ragResult.sources.length;
  const topScore = input.ragResult.sources[0]?.score ?? 0;
  if (sourceCount < 2) {
    return { run: true, reason: 'LOW_SOURCE_COUNT' };
  }
  if (topScore < 0.72) {
    return { run: true, reason: 'LOW_CONFIDENCE' };
  }

  return { run: false, reason: 'RAG_SUFFICIENT' };
}

async function fetchWebSearchWithFallback(query: string, mode: WebSearchMode): Promise<WebSearchResult> {
  if (mode === 'off') {
    return {
      enabled: false,
      mode,
      items: [],
      reason: 'MODE_OFF',
    };
  }

  const providers: Array<{
    name: WebSearchProvider;
    run: (input: string) => Promise<{ items: WebSearchItem[]; error?: string }>;
  }> = [
    { name: 'bing-rss', run: fetchBingRssItems },
    { name: 'bing-jina', run: fetchBingJinaItems },
    { name: 'duckduckgo', run: fetchWebSearchItems },
  ];

  const errors: string[] = [];
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const result = await provider.run(query);
    if (result.items.length > 0) {
      return {
        enabled: true,
        mode,
        items: dedupeWebSearchItems(result.items).slice(0, 5),
        provider: provider.name,
        fallbackUsed: index > 0,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    }
    if (result.error) {
      errors.push(`${provider.name}:${result.error}`);
    }
  }

  return {
    enabled: true,
    mode,
    items: [],
    fallbackUsed: true,
    error: errors.length > 0 ? errors.join('; ') : 'WEB_SEARCH_NO_RESULT',
  };
}

async function resolveRequestHistory(input: {
  history: SearchHistoryItem[];
  conversationId?: string;
  userId: string;
}): Promise<SearchHistoryItem[]> {
  if (input.history.length > 0 || !input.conversationId) {
    return input.history;
  }

  try {
    const rows = await prisma.chatMessage.findMany({
      where: {
        conversationId: input.conversationId,
        conversation: {
          userId: input.userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        role: true,
        content: true,
      },
    });

    return rows
      .slice()
      .reverse()
      .map((item) => ({
        role: item.role === 'USER' ? 'user' : 'assistant',
        content: item.content,
      }));
  } catch {
    return input.history;
  }
}

async function persistConversationExchange(input: {
  conversationId?: string;
  userId: string;
  projectId?: string;
  query: string;
  answer: string;
  meta: {
    citations: string[];
    sources: number;
    web: number;
    model: string;
    apiBacked: boolean;
    callPath?: string;
    references?: Array<{
      title: string;
      url?: string;
      snippet?: string;
      provider?: string;
      sourceType?: string;
    }>;
  };
}) {
  if (!input.conversationId) {
    return;
  }

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id: input.conversationId,
      userId: input.userId,
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!conversation) {
    return;
  }

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: 'USER',
        content: input.query,
      },
      {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: input.answer,
        meta: JSON.stringify(input.meta),
      },
    ],
  });

  const nextTitle =
    conversation._count.messages === 0 || conversation.title === '新对话'
      ? trimContent(input.query.trim(), 24)
      : conversation.title;

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: {
      title: nextTitle || '新对话',
      projectId: conversation.projectId || input.projectId || null,
    },
  });
}

function mapAttachmentsToCandidates(attachments: SearchAttachment[]): QueryCandidate[] {
  return attachments.map((item, index) => ({
    id: `attachment:${index + 1}:${item.name}`,
    title: item.name,
    snippet: trimContent(item.content, 180),
    score: 0.82,
    source: 'vector',
    metadata: {
      sourceType: 'attachment',
      attachmentName: item.name,
    },
  }));
}

function mapWebSearchToCandidates(items: WebSearchItem[]): QueryCandidate[] {
  return items.map((item, index) => ({
    id: `web:${index + 1}:${item.url || item.title}`,
    title: item.title,
    snippet: trimContent(item.snippet, 180),
    score: 0.76,
    source: 'vector',
    metadata: {
      sourceType: 'web',
      url: item.url,
    },
  }));
}

async function resolveAiRuntimeConfig(input: {
  userId: string;
  requestModel?: string;
}): Promise<ResolvedAiRuntimeConfig> {
  const requestModel =
    input.requestModel && CHAT_MODEL_IDS.includes(input.requestModel as (typeof CHAT_MODEL_IDS)[number])
      ? input.requestModel
      : undefined;

  const settingRecord = await prisma.userAiSetting.findUnique({
    where: { userId: input.userId },
    select: {
      enableAI: true,
      model: true,
      apiKeyEncrypted: true,
      temperature: true,
      maxTokens: true,
      topP: true,
      frequencyPenalty: true,
      presencePenalty: true,
    },
  });

  const savedModel =
    settingRecord?.model && CHAT_MODEL_IDS.includes(settingRecord.model as (typeof CHAT_MODEL_IDS)[number])
      ? settingRecord.model
      : undefined;
  const model = requestModel || savedModel || DEFAULT_CHAT_MODEL;
  const baseUrl = (process.env.OPENAI_BASE_URL || '').trim();

  let fallbackKey = '';
  if (settingRecord?.apiKeyEncrypted) {
    try {
      fallbackKey = decryptText(settingRecord.apiKeyEncrypted).trim();
    } catch {
      fallbackKey = '';
    }
  }

  let bindingApiKey = '';
  let bindingApiKeyId: string | null = null;
  let bindingProvider = MODEL_PROVIDER_MAP[model] || 'openai-compatible';
  const bindingModel = (prisma as any).userModelApiKeyBinding;
  if (bindingModel?.findUnique) {
    const binding = await bindingModel.findUnique({
      where: {
        userId_model: {
          userId: input.userId,
          model,
        },
      },
      include: {
        apiKey: {
          select: {
            id: true,
            key: true,
            provider: true,
            isActive: true,
          },
        },
      },
    });
    if (binding?.apiKey?.isActive && binding.apiKey.key) {
      try {
        bindingApiKey = decryptText(binding.apiKey.key).trim();
        bindingApiKeyId = binding.apiKey.id;
        bindingProvider = binding.apiKey.provider || bindingProvider;
      } catch {
        bindingApiKey = '';
      }
    }
  }

  return {
    model,
    apiKey: bindingApiKey || fallbackKey,
    apiKeyId: bindingApiKeyId,
    provider: bindingProvider,
    baseUrl,
    enableAI: settingRecord?.enableAI ?? true,
    temperature: settingRecord?.temperature ?? 0.7,
    maxTokens: settingRecord?.maxTokens ?? 2000,
    topP: settingRecord?.topP ?? 1,
    frequencyPenalty: settingRecord?.frequencyPenalty ?? 0,
    presencePenalty: settingRecord?.presencePenalty ?? 0,
    source: requestModel ? 'request' : savedModel ? 'user_setting' : 'default',
  };
}

function buildRuntimeModelMeta(config: ResolvedAiRuntimeConfig): RuntimeModelMeta {
  if (!config.enableAI) {
    return {
      requestedModel: config.model,
      usedModel: config.model,
      provider: config.provider,
      source: config.source,
      apiBacked: false,
      callPath: 'controlled',
      apiKeyId: config.apiKeyId,
      baseUrl: config.baseUrl,
      reason: 'AI_DISABLED',
    };
  }
  if (!config.apiKey) {
    return {
      requestedModel: config.model,
      usedModel: config.model,
      provider: config.provider,
      source: config.source,
      apiBacked: false,
      callPath: 'controlled',
      apiKeyId: config.apiKeyId,
      baseUrl: config.baseUrl,
      reason: 'API_KEY_MISSING',
    };
  }
  return {
    requestedModel: config.model,
    usedModel: config.model,
    provider: config.provider,
    source: config.source,
    apiBacked: true,
    callPath: 'chat.completions',
    apiKeyId: config.apiKeyId,
    baseUrl: config.baseUrl,
  };
}

async function generateModelAnswer(input: {
  query: string;
  history: SearchHistoryItem[];
  runtime: ResolvedAiRuntimeConfig;
  ragSources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  webSearchItems: WebSearchItem[];
  attachments: SearchAttachment[];
}): Promise<ModelAnswerResult | null> {
  if (!input.runtime.enableAI || !input.runtime.apiKey) {
    return null;
  }

  const targetTokenBudget = Math.max(1200, Math.min(input.runtime.maxTokens, 6000));

  const evidenceBlocks = [
    ...input.ragSources.slice(0, 5).map((item, index) => ({
      label: `rag-${index + 1}`,
      content: trimByTokenBudget(item.content, 600),
    })),
    ...input.webSearchItems.slice(0, 3).map((item, index) => ({
      label: `web-${index + 1}`,
      content: `${item.title}: ${item.snippet}${item.url ? ` (${item.url})` : ''}`,
    })),
    ...input.attachments.slice(0, 2).map((item, index) => ({
      label: `attachment-${index + 1}`,
      content: `${item.name}: ${trimByTokenBudget(item.content, 500)}`,
    })),
  ];

  if (evidenceBlocks.length === 0) {
    return null;
  }

  const evidenceText = evidenceBlocks
    .map((block) => `[${block.label}] ${block.content}`)
    .join('\n\n');
  const historyText = input.history
    .slice(-8)
    .map(
      (item, index) =>
        `${index + 1}. ${item.role === 'user' ? '用户' : '助手'}: ${trimContent(item.content, 220)}`
    )
    .join('\n');

  const systemPrompt =
    'You are an enterprise testing assistant. Answer in Chinese. Ground your answer in provided evidence, avoid fabrication, and provide a complete actionable response.';
  const userPrompt = [
    `Question: ${input.query}`,
    historyText ? 'Conversation History:' : '',
    historyText || '',
    'Evidence:',
    evidenceText,
    'Rules:',
    '1) Prefer evidence-backed statements.',
    '2) If evidence is insufficient, clearly state the gap and next step.',
    '3) Do not truncate; answer with enough detail to complete the task.',
  ].join('\n');

  const client = createAIClient({
    apiKey: input.runtime.apiKey,
    baseUrl: input.runtime.baseUrl || undefined,
    timeout: 45000,
  });
  const responseClient = client as unknown as {
    responses?: {
      create: (params: Record<string, unknown>) => Promise<Record<string, any>>;
    };
  };

  if (responseClient.responses?.create) {
    try {
      const response = await responseClient.responses.create({
        model: input.runtime.model,
        input: [
          {
            role: 'system',
            content: [{ type: 'text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'text', text: userPrompt }],
          },
        ],
        temperature: Math.max(0, Math.min(2, input.runtime.temperature)),
        top_p: Math.max(0, Math.min(1, input.runtime.topP)),
        max_output_tokens: targetTokenBudget,
      });

      const rawText =
        typeof response.output_text === 'string'
          ? response.output_text
          : Array.isArray(response.output)
            ? response.output
                .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
                .map((item: any) => (typeof item?.text === 'string' ? item.text : ''))
                .join('\n')
            : '';
      const text = rawText.trim();
      if (text) {
        const usage = response.usage
          ? {
              requestTokens: Number(response.usage.input_tokens || 0),
              responseTokens: Number(response.usage.output_tokens || 0),
              totalTokens: Number(response.usage.total_tokens || 0),
            }
          : undefined;
        return {
          text,
          callPath: 'responses',
          usage,
        };
      }
    } catch {
      // fallback to chat.completions
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model: input.runtime.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: Math.max(0, Math.min(2, input.runtime.temperature)),
      max_tokens: Math.max(256, Math.min(4096, targetTokenBudget)),
      top_p: Math.max(0, Math.min(1, input.runtime.topP)),
      frequency_penalty: Math.max(-2, Math.min(2, input.runtime.frequencyPenalty)),
      presence_penalty: Math.max(-2, Math.min(2, input.runtime.presencePenalty)),
    });

    const text = completion.choices[0]?.message?.content;
    if (typeof text === 'string' && text.trim().length > 0) {
      const usage = completion.usage
        ? {
            requestTokens: Number(completion.usage.prompt_tokens || 0),
            responseTokens: Number(completion.usage.completion_tokens || 0),
            totalTokens: Number(completion.usage.total_tokens || 0),
          }
        : undefined;
      return {
        text: text.trim(),
        callPath: 'chat.completions',
        usage,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function computeKeywordOverlapScore(query: string, content: string): number {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (queryTokens.length === 0) {
    return 0;
  }

  const text = content.toLowerCase();
  const matched = queryTokens.filter((token) => text.includes(token)).length;
  return matched / queryTokens.length;
}

async function buildFallbackRagResult(input: {
  query: string;
  topK: number;
  userId: string;
  projectIds: string[];
  failureReason: string;
}): Promise<RAGQuerySummary> {
  const startedAt = Date.now();
  const queryText = input.query.trim();
  const queryFilter = {
    OR: [{ title: { contains: queryText } }, { content: { contains: queryText } }],
  };

  const knowledgeScopeFilter =
    input.projectIds.length > 0
      ? [{ projectId: { in: input.projectIds } }, { authorId: input.userId }]
      : [{ authorId: input.userId }];

  const [knowledgeEntries, aiRequirements] = await Promise.all([
    prisma.knowledgeEntry.findMany({
      where: {
        AND: [{ OR: knowledgeScopeFilter }, queryFilter],
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(input.topK * 2, 12),
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        projectId: true,
        updatedAt: true,
      },
    }),
    input.projectIds.length > 0
      ? prisma.aiRequirement.findMany({
          where: {
            projectId: { in: input.projectIds },
            OR: [{ title: { contains: queryText } }, { content: { contains: queryText } }],
          },
          orderBy: { updatedAt: 'desc' },
          take: Math.max(input.topK, 8),
          select: {
            id: true,
            title: true,
            content: true,
            projectId: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const candidates = [
    ...knowledgeEntries.map((item) => ({
      id: `knowledge:${item.id}`,
      title: item.title,
      content: item.content,
      score: 0.45 + computeKeywordOverlapScore(queryText, `${item.title} ${item.content}`) * 0.55,
      metadata: {
        sourceType: 'knowledge_entry',
        category: item.category,
        projectId: item.projectId,
        updatedAt: item.updatedAt,
      } as Record<string, unknown>,
    })),
    ...aiRequirements.map((item) => ({
      id: `ai_requirement:${item.id}`,
      title: item.title,
      content: item.content,
      score: 0.4 + computeKeywordOverlapScore(queryText, `${item.title} ${item.content}`) * 0.6,
      metadata: {
        sourceType: 'ai_requirement',
        projectId: item.projectId,
        updatedAt: item.updatedAt,
      } as Record<string, unknown>,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, input.topK);

  const sources = candidates.map((item) => ({
    id: item.id,
    content: trimContent(item.content, 500),
    score: Number(item.score.toFixed(4)),
    metadata: {
      ...item.metadata,
      title: item.title,
    },
  }));
  const citations = candidates.map((item, index) => `[${index + 1}] ${item.title}`);
  const fallbackPrefix = 'RAG 引擎暂不可用，已自动切换为基础检索模式。';
  const answer =
    candidates.length > 0
      ? `${fallbackPrefix}\n\n已检索到 ${candidates.length} 条相关内容，可先基于这些证据继续分析：\n${candidates
          .slice(0, 3)
          .map((item, index) => `${index + 1}. ${item.title}：${trimContent(item.content, 120)}`)
          .join('\n')}`
      : `${fallbackPrefix}\n\n当前未找到与“${queryText}”直接匹配的数据。建议先补充知识库内容，或换更具体的关键词。`;

  return {
    answer,
    sources,
    citations,
    context: {
      query: queryText,
      rewrittenQuery: queryText,
      retrievalTime: Date.now() - startedAt,
      cacheHit: false,
    },
    selfRAGResult: {
      reflections: [`fallback_reason=${trimContent(input.failureReason, 160)}`],
      citations,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const validated = searchSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validated.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      query,
      departmentId,
      projectId,
      conversationId,
      history = [],
      options,
      model,
      attachments = [],
    } = validated.data;
    const normalizedHistory = normalizeHistory(history);
    const topK = options?.topK ?? 10;
    const access = await resolveAccessibleProjectIds(session.user.id, projectId);
    const runtimeConfig = await resolveAiRuntimeConfig({
      userId: session.user.id,
      requestModel: model,
    });
    let runtimeModelMeta = buildRuntimeModelMeta(runtimeConfig);
    const webSearchMode: WebSearchMode =
      options?.webSearchMode || (options?.enableWebSearch ? 'manual' : 'off');
    const conversationHistory = normalizeHistory(
      await resolveRequestHistory({
        history: normalizedHistory,
        conversationId,
        userId: session.user.id,
      })
    );
    const effectiveQuery = buildContextualQuery(query, conversationHistory);
    const webSearchQuery = buildWebSearchQuery(query, conversationHistory);

    if (access.forbidden) {
      return NextResponse.json({ error: 'FORBIDDEN', code: 'FORBIDDEN' }, { status: 403 });
    }

    const strategy = await resolveRagStrategyConfig({
      projectId,
      overrides: {
        multiQuery: options?.enableMultiQuery,
        hyde: options?.enableHyDE,
        decomposition: options?.enableDecomposition,
        fusion: options?.enableFusion,
      },
    });

    const latestRoutingRuleSet = await getLatestRoutingRuleSet(projectId);
    let routingRules: ReturnType<typeof parseRoutingRules> = [];
    if (latestRoutingRuleSet) {
      try {
        routingRules = parseRoutingRules(JSON.parse(latestRoutingRuleSet.rulesJson));
      } catch {
        routingRules = [];
      }
    }
    const routingDecision = evaluateRoutingRules({
      rules: routingRules,
      context: {
        query,
        departmentId,
        projectId,
      },
    });

    const shouldRunMultiSource =
      options?.enableMultiSource ??
      (strategy.toggles.multiQuery ||
        strategy.toggles.decomposition ||
        strategy.toggles.fusion ||
        !!routingDecision.matchedRule);
    const enableActiveRetrieval = options?.enableActiveRetrieval ?? false;

    const activePromptTemplates = await getActivePromptTemplates(projectId);
    const semanticRouting = selectPromptTemplate({
      query,
      templates: activePromptTemplates,
    });

    let ragResult: RAGQuerySummary;
    let totalTime = 0;
    let webSearch: WebSearchResult | undefined;
    let fallback:
      | {
          enabled: boolean;
          reason: string;
        }
      | undefined;

    const ragStartAt = Date.now();
    try {
      const ragService = getRAGService({
        departmentId,
        departmentName: departmentId,
        projectId,
        projectName: projectId,
        topK,
        enableHyDE: strategy.toggles.hyde,
        enableQueryRewrite: options?.enableQueryRewrite ?? true,
        enableSelfRAG: options?.enableSelfRAG ?? false,
      });
      await ragService.initialize();
      const queried = await ragService.query(effectiveQuery);
      ragResult = {
        answer: queried.answer,
        sources: queried.sources,
        citations: queried.citations,
        context: {
          query: queried.context.query,
          rewrittenQuery: queried.context.rewrittenQuery,
          retrievalTime: queried.context.retrievalTime,
          cacheHit: queried.context.cacheHit ?? false,
        },
        selfRAGResult: queried.selfRAGResult
          ? {
              reflections: queried.selfRAGResult.reflections,
              citations: queried.selfRAGResult.citations,
            }
          : undefined,
      };
    } catch (error) {
      const reason = toErrorMessage(error);
      fallback = {
        enabled: true,
        reason,
      };
      ragResult = await buildFallbackRagResult({
        query,
        topK,
        userId: session.user.id,
        projectIds: access.projectIds,
        failureReason: reason,
      });
      try {
        await writeAuditLog({
          actorId: session.user.id,
          action: 'KNOWLEDGE_SEARCH_FALLBACK',
          target: 'KNOWLEDGE_SEARCH',
          targetId: projectId || 'multi-project-scope',
          projectId,
          metadata: {
            queryPreview: query.slice(0, 120),
            reason: trimContent(reason, 240),
            projectScopeCount: access.projectIds.length,
          },
        });
      } catch {
        // Ignore audit failure to avoid blocking answer.
      }
    }
    totalTime = Date.now() - ragStartAt;

    if (webSearchMode === 'manual') {
      webSearch = await fetchWebSearchWithFallback(webSearchQuery, webSearchMode);
      webSearch.reason = 'MANUAL_ENABLED';
    } else if (webSearchMode === 'smart') {
      const decision = shouldTriggerSmartWebSearch({
        query,
        ragResult,
        fallback,
      });
      if (decision.run) {
        webSearch = await fetchWebSearchWithFallback(webSearchQuery, webSearchMode);
      } else {
        webSearch = {
          enabled: false,
          mode: webSearchMode,
          items: [],
        };
      }
      webSearch.reason = decision.reason;
    } else {
      webSearch = {
        enabled: false,
        mode: webSearchMode,
        items: [],
        reason: 'MODE_OFF',
      };
    }

    let multiSource: MultiSourceSummary | undefined;
    let fusedEvidence: QueryCandidate[] | undefined;

    if (shouldRunMultiSource) {
      const queryVariants = buildQueryVariants(query, {
        multiQuery: strategy.toggles.multiQuery,
        decomposition: strategy.toggles.decomposition,
      });

      const variantResults = await Promise.all(
        queryVariants.map(async (variant) => ({
          variant,
          result: await executeMultiSourceQuery({
            query: variant,
            projectIds: access.projectIds,
            topK,
          }),
        }))
      );

      const taggedResults = variantResults.map((item) =>
        withVariantTag(item.result, item.variant)
      );
      const selectedSources = routingDecision.selectedSources.length
        ? routingDecision.selectedSources
        : DEFAULT_ROUTING_SOURCES;
      const plans = taggedResults
        .flatMap((item) => item.plans)
        .filter((item) => selectedSources.includes(item.source));
      const sourceResults = taggedResults
        .flatMap((item) => item.sourceResults)
        .filter((item) => selectedSources.includes(item.source));
      const mergedCandidates = mergeCandidates(
        taggedResults
          .flatMap((item) => item.mergedCandidates)
          .filter((item) => selectedSources.includes(item.source)),
        topK
      );
      const failedSources = toFailedSources(sourceResults);

      multiSource = {
        queryVariants,
        plans,
        sourceResults,
        mergedCandidates,
        failedSources,
      };

      await logMultiSourceFailures({
        actorId: session.user.id,
        query,
        explicitProjectId: projectId,
        projectIds: access.projectIds,
        failedSources,
      });

      if (strategy.toggles.fusion) {
        const ragCandidates = mapRagSourcesToCandidates(ragResult.sources);
        fusedEvidence = mergeCandidates([...ragCandidates, ...mergedCandidates], topK);
      }
    }

    const epic5Enabled =
      (options?.enableRefinement ?? false) ||
      (options?.enableReranking ?? false) ||
      (options?.enableActiveRetrieval ?? false) ||
      Boolean(options?.generationMode);
    const generationMode: ControlledGenerationMode =
      options?.generationMode || (options?.enableSelfRAG ? 'self-rag' : 'standard');

    let finalAnswer = ragResult.answer;
    let finalCitations = ragResult.citations;
    let retrievalRefinement:
      | {
          enabled: boolean;
          coverage: number;
          items: Array<{
            id: string;
            source: string;
            refinedScore: number;
            reasonSummary: string;
          }>;
          explainability: ReturnType<typeof refineRetrievalEvidence>['explainability'];
        }
      | undefined;
    let reranking:
      | {
          enabled: boolean;
          model: string;
          top: Array<{
            id: string;
            source: string;
            rank: number;
            rerankScore: number;
            rationale: string[];
          }>;
        }
      | undefined;
    let generationControl:
      | {
          mode: ControlledGenerationMode;
          iterations: number;
          confidence: number;
          activeRetrievalTriggered: boolean;
          trace: ControlledGenerationResult['trace'];
          usedEvidence: Array<{
            id: string;
            source: string;
            rerankScore: number;
          }>;
        }
      | undefined;

    if (epic5Enabled) {
      const ragCandidates = mapRagSourcesToCandidates(ragResult.sources);
      const attachmentCandidates = mapAttachmentsToCandidates(attachments);
      const webCandidates = webSearch ? mapWebSearchToCandidates(webSearch.items) : [];
      const candidateBase = mergeCandidates(
        [
          ...ragCandidates,
          ...attachmentCandidates,
          ...webCandidates,
          ...(multiSource?.mergedCandidates || []),
          ...(fusedEvidence || []),
        ],
        Math.max(topK, 8)
      );

      const refinementResult = options?.enableRefinement
        ? refineRetrievalEvidence({
            query,
            candidates: candidateBase,
            topK: Math.max(topK, 8),
          })
        : {
            items: toDefaultRefinedEvidence(candidateBase, Math.max(topK, 8)),
            explainability: [],
            coverage: 0,
          };

      retrievalRefinement = {
        enabled: options?.enableRefinement ?? false,
        coverage: refinementResult.coverage,
        items: refinementResult.items.map((item) => ({
          id: item.id,
          source: item.source,
          refinedScore: item.refinedScore,
          reasonSummary: item.reasonSummary,
        })),
        explainability: refinementResult.explainability,
      };

      const rerankingResult = options?.enableReranking
        ? rerankEvidence({
            query,
            candidates: refinementResult.items,
            topN: Math.max(topK, 8),
          })
        : {
            model: 'cross-encoder-lite' as const,
            items: refinementResult.items.map((item, index) => ({
              ...item,
              rerankScore: item.refinedScore,
              rank: index + 1,
              rationale: ['reranking_disabled'],
            })),
          };

      reranking = {
        enabled: options?.enableReranking ?? false,
        model: rerankingResult.model,
        top: rerankingResult.items.map((item) => ({
          id: item.id,
          source: item.source,
          rank: item.rank,
          rerankScore: item.rerankScore,
          rationale: item.rationale,
        })),
      };

      const generationResult = await runControlledGeneration({
        query,
        mode: generationMode,
        evidence: rerankingResult.items,
        activeRetrieval: enableActiveRetrieval,
        maxIterations: options?.maxGenerationIterations,
        retrieveMore: shouldRunMultiSource || enableActiveRetrieval
          ? async (followupQuery: string) => {
              const extra = await executeMultiSourceQuery({
                query: followupQuery,
                projectIds: access.projectIds,
                topK: Math.max(topK, 8),
              });
              return extra.mergedCandidates;
            }
          : undefined,
      });

      finalAnswer = generationResult.answer;
      finalCitations = generationResult.citations.map(
        (citation) => `${citation.label} ${citation.source}: ${citation.excerpt}`
      );
      generationControl = {
        mode: generationResult.mode,
        iterations: generationResult.iterations,
        confidence: generationResult.confidence,
        activeRetrievalTriggered: generationResult.activeRetrievalTriggered,
        trace: generationResult.trace,
        usedEvidence: generationResult.usedEvidence.map((item) => ({
          id: item.id,
          source: item.source,
          rerankScore: item.rerankScore,
        })),
      };

      await writeAuditLog({
        actorId: session.user.id,
        action: 'RAG_CONTROLLED_GENERATION_COMPLETED',
        target: 'KNOWLEDGE_SEARCH',
        targetId: projectId || 'multi-project-scope',
        projectId,
        metadata: {
          queryPreview: query.slice(0, 120),
          generationMode,
          iterations: generationResult.iterations,
          confidence: generationResult.confidence,
          activeRetrievalTriggered: generationResult.activeRetrievalTriggered,
        },
      });

      if (generationResult.activeRetrievalTriggered) {
        await writeAuditLog({
          actorId: session.user.id,
          action: 'RAG_ACTIVE_RETRIEVAL_TRIGGERED',
          target: 'KNOWLEDGE_SEARCH',
          targetId: projectId || 'multi-project-scope',
          projectId,
          metadata: {
            queryPreview: query.slice(0, 120),
            trace: generationResult.trace,
          },
        });
      }
    }

    const modelCallStartAt = Date.now();
    const modelAnswer = await generateModelAnswer({
      query,
      history: conversationHistory,
      runtime: runtimeConfig,
      ragSources: ragResult.sources,
      webSearchItems: webSearch?.items || [],
      attachments,
    });
    const references = buildReferencesFromWebSearch(webSearch?.items || [], webSearch?.provider);
    if (modelAnswer) {
      finalAnswer = modelAnswer.text;
      runtimeModelMeta = {
        ...runtimeModelMeta,
        usedModel: runtimeConfig.model,
        apiBacked: true,
        callPath: modelAnswer.callPath,
        usage: modelAnswer.usage,
      };
      finalCitations = dedupeText([
        ...ragResult.citations,
        ...(webSearch?.items || []).map(
          (item, index) => `[web-${index + 1}] ${item.title}${item.url ? ` ${item.url}` : ''}`
        ),
        ...attachments.map((item, index) => `[attachment-${index + 1}] ${item.name}`),
      ]).slice(0, 12);
    } else if (runtimeModelMeta.apiBacked) {
      runtimeModelMeta = {
        ...runtimeModelMeta,
        apiBacked: false,
        callPath: 'controlled',
        reason: 'MODEL_CALL_FAILED',
      };
    }

    try {
      await persistConversationExchange({
        conversationId,
        userId: session.user.id,
        projectId,
        query,
        answer: finalAnswer,
        meta: {
          citations: finalCitations,
          sources: ragResult.sources.length,
          web: webSearch?.items.length || 0,
          model: runtimeModelMeta.usedModel,
          apiBacked: runtimeModelMeta.apiBacked,
          callPath: runtimeModelMeta.callPath,
          references,
        },
      });
    } catch (persistError) {
      console.error('Failed to persist chat conversation exchange:', persistError);
    }

    try {
      if (runtimeConfig.enableAI && runtimeConfig.apiKey) {
        await recordModelCallStat({
          userId: session.user.id,
          conversationId,
          apiKeyId: runtimeModelMeta.apiKeyId,
          model: runtimeModelMeta.usedModel,
          provider: runtimeModelMeta.provider,
          callPath: runtimeModelMeta.callPath,
          usage: runtimeModelMeta.usage,
          latencyMs: Date.now() - modelCallStartAt,
          webEnabled: Boolean(webSearch?.enabled && (webSearch?.items?.length || 0) > 0),
          success: Boolean(modelAnswer),
          fallbackReason: modelAnswer ? undefined : runtimeModelMeta.reason || 'MODEL_CALL_FAILED',
        });
      }
    } catch (statError) {
      console.error('Failed to persist ai model call stats:', statError);
    }

    return NextResponse.json({
      success: true,
      data: {
        answer: finalAnswer,
        sources: ragResult.sources.map((source) => ({
          id: source.id,
          content: trimContent(source.content),
          score: source.score,
          metadata: source.metadata,
        })),
        citations: finalCitations,
        context: {
          query: ragResult.context.query,
          rewrittenQuery: ragResult.context.rewrittenQuery,
          retrievalTime: ragResult.context.retrievalTime,
          totalTime,
          cacheHit: ragResult.context.cacheHit,
          conversationId,
        },
        strategy: {
          configId: strategy.id,
          version: strategy.version,
          source: strategy.source,
          toggles: {
            multiQuery: strategy.toggles.multiQuery,
            hyde: strategy.toggles.hyde,
            decomposition: strategy.toggles.decomposition,
            fusion: strategy.toggles.fusion,
            queryRewrite: options?.enableQueryRewrite ?? true,
            selfRAG: options?.enableSelfRAG ?? false,
            multiSource: shouldRunMultiSource,
          },
        },
        routing: {
          ruleSetVersion: latestRoutingRuleSet?.version ?? 0,
          matchedRule: routingDecision.matchedRule,
          selectedSources: routingDecision.selectedSources,
          reason: routingDecision.reason,
        },
        semanticRouting: {
          templateId: semanticRouting.templateId,
          scenario: semanticRouting.scenario,
          name: semanticRouting.name,
          version: semanticRouting.version,
          confidence: semanticRouting.confidence,
          reason: semanticRouting.reason,
          promptPreview: trimContent(semanticRouting.appliedPrompt, 200),
        },
        multiSource,
        fusedEvidence,
        retrievalRefinement,
        reranking,
        generationControl,
        modelRuntime: runtimeModelMeta,
        webSearch,
        references,
        attachments: attachments.map((item) => ({
          name: item.name,
          size: item.content.length,
        })),
        fallback,
        selfRAG: ragResult.selfRAGResult
          ? {
              reflections: ragResult.selfRAGResult.reflections,
              citations: ragResult.selfRAGResult.citations,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error('Knowledge search failed:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    options: {
      topK: { min: 1, max: 50, default: 10, description: 'Max returned candidates' },
      enableHyDE: { type: 'boolean', default: true, description: 'Enable HyDE retrieval' },
      enableQueryRewrite: { type: 'boolean', default: true, description: 'Enable query rewrite' },
      enableSelfRAG: { type: 'boolean', default: false, description: 'Enable Self-RAG' },
      enableMultiSource: {
        type: 'boolean',
        default: false,
        description: 'Enable relational/graph/vector concurrent retrieval',
      },
      enableMultiQuery: {
        type: 'boolean',
        default: false,
        description: 'Enable query expansion variants',
      },
      enableDecomposition: {
        type: 'boolean',
        default: false,
        description: 'Enable complex query decomposition',
      },
      enableFusion: {
        type: 'boolean',
        default: false,
        description: 'Enable fused evidence output',
      },
      enableRefinement: {
        type: 'boolean',
        default: false,
        description: 'Enable retrieval refinement with explainability',
      },
      enableReranking: {
        type: 'boolean',
        default: false,
        description: 'Enable reranking service for final evidence order',
      },
      enableActiveRetrieval: {
        type: 'boolean',
        default: false,
        description: 'Enable follow-up retrieval during generation',
      },
      enableWebSearch: {
        type: 'boolean',
        default: false,
        description: 'Legacy toggle for web enrichment (maps to manual mode)',
      },
      webSearchMode: {
        type: 'enum',
        values: ['smart', 'manual', 'off'],
        default: 'off',
        description: 'Smart uses RAG-first decision; manual forces web search; off disables',
      },
      generationMode: {
        type: 'enum',
        values: ['standard', 'self-rag', 'rrr'],
        default: 'standard',
        description: 'Controlled generation mode',
      },
      maxGenerationIterations: {
        min: 1,
        max: 5,
        default: 3,
        description: 'Max control-loop iterations',
      },
    },
    model: {
      type: 'enum',
      values: CHAT_MODEL_IDS,
      default: DEFAULT_CHAT_MODEL,
      description: 'Preferred generation model for API-backed answer',
    },
    attachments: {
      type: 'array',
      maxItems: 3,
      description: 'Optional inline file excerpts',
    },
    features: [
      'Hybrid retrieval (Dense + BM25)',
      'Cross-encoder rerank',
      'Query rewrite',
      'HyDE',
      'Self-RAG',
      'Multi-source planning and execution',
      'Strategy-version metadata',
      'Logic routing rule hint',
      'Semantic template routing',
      'Retrieval refinement explainability',
      'Active retrieval cited generation',
      'Self-RAG / RRR controlled generation',
      'Optional web search enrichment with provider fallback',
      'Model-runtime fallback metadata',
      'Conversation history-aware generation',
    ],
  });
}
