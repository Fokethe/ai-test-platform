import { QueryCandidate } from '@/lib/ai/rag/multi-source-query';
import { RerankedEvidence } from '@/lib/ai/rag/reranking-service';

export type ControlledGenerationMode = 'standard' | 'self-rag' | 'rrr';

export interface GeneratedCitation {
  id: string;
  label: string;
  source: string;
  excerpt: string;
  score: number;
}

export interface GenerationTraceStep {
  iteration: number;
  phase: 'reflect' | 'retrieve' | 'revise';
  note: string;
  query?: string;
  addedEvidenceCount?: number;
  confidence: number;
}

export interface ControlledGenerationResult {
  mode: ControlledGenerationMode;
  answer: string;
  citations: GeneratedCitation[];
  iterations: number;
  confidence: number;
  activeRetrievalTriggered: boolean;
  trace: GenerationTraceStep[];
  usedEvidence: RerankedEvidence[];
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function coverage(query: string, evidence: Array<{ title: string; snippet: string }>): number {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) {
    return 0;
  }

  const covered = new Set<string>();
  const evidenceText = evidence.map((item) => `${item.title} ${item.snippet}`.toLowerCase());
  qTokens.forEach((token) => {
    if (evidenceText.some((text) => text.includes(token))) {
      covered.add(token);
    }
  });

  return Number((covered.size / qTokens.length).toFixed(4));
}

function makeFollowupQuery(query: string, evidence: Array<{ title: string; snippet: string }>): string {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) {
    return query;
  }
  const evidenceText = evidence.map((item) => `${item.title} ${item.snippet}`.toLowerCase());
  const missing = qTokens.filter((token) => !evidenceText.some((text) => text.includes(token)));
  if (missing.length === 0) {
    return `${query} more details`;
  }
  return `${query} ${missing.slice(0, 3).join(' ')} details`;
}

function toCitations(items: RerankedEvidence[]): GeneratedCitation[] {
  return items.map((item, index) => ({
    id: item.id,
    label: `[${index + 1}]`,
    source: item.source,
    excerpt: item.snippet.slice(0, 160),
    score: Number(item.rerankScore.toFixed(4)),
  }));
}

function composeAnswer(query: string, citations: GeneratedCitation[]): string {
  if (citations.length === 0) {
    return `未检索到足够证据，暂时无法可靠回答“${query}”。`;
  }
  const points = citations
    .slice(0, 4)
    .map((citation) => `${citation.label} ${citation.excerpt}`)
    .join('\n');
  return `基于当前检索证据，关于“${query}”的结论如下：\n${points}`;
}

function dedupeById(items: RerankedEvidence[]): RerankedEvidence[] {
  const map = new Map<string, RerankedEvidence>();
  items.forEach((item) => {
    const existing = map.get(item.id);
    if (!existing || item.rerankScore > existing.rerankScore) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => b.rerankScore - a.rerankScore);
}

function normalizeCandidates(candidates: QueryCandidate[]): RerankedEvidence[] {
  return candidates.map((candidate, index) => ({
    ...candidate,
    refinedScore: candidate.score,
    rerankScore: candidate.score,
    reasonSummary: 'retrieved_from_active_retrieval',
    rank: index + 1,
    rationale: ['active_retrieval_result'],
  }));
}

export async function runControlledGeneration(input: {
  query: string;
  mode: ControlledGenerationMode;
  evidence: RerankedEvidence[];
  activeRetrieval?: boolean;
  maxIterations?: number;
  retrieveMore?: (followupQuery: string) => Promise<QueryCandidate[]>;
}): Promise<ControlledGenerationResult> {
  const mode = input.mode;
  const maxIterations = Math.max(1, Math.min(input.maxIterations ?? 3, 5));
  const trace: GenerationTraceStep[] = [];
  let activeRetrievalTriggered = false;
  let iterations = 1;
  let workingEvidence = dedupeById(input.evidence).slice(0, 10);
  let confidence = coverage(input.query, workingEvidence);

  trace.push({
    iteration: 1,
    phase: 'reflect',
    note: `initial_coverage=${confidence.toFixed(2)}`,
    confidence,
  });

  const shouldRetrieve =
    input.activeRetrieval &&
    typeof input.retrieveMore === 'function' &&
    confidence < 0.72 &&
    (mode === 'self-rag' || mode === 'rrr');

  if (shouldRetrieve) {
    const followupQuery = makeFollowupQuery(input.query, workingEvidence);
    const retrieved = await input.retrieveMore!(followupQuery);
    const normalized = normalizeCandidates(retrieved);
    const beforeCount = workingEvidence.length;
    workingEvidence = dedupeById([...workingEvidence, ...normalized]).slice(0, 10);
    const addedEvidenceCount = Math.max(0, workingEvidence.length - beforeCount);
    activeRetrievalTriggered = true;
    iterations = Math.min(maxIterations, 2);
    confidence = coverage(input.query, workingEvidence);
    trace.push({
      iteration: 2,
      phase: 'retrieve',
      note: `followup_retrieval`,
      query: followupQuery,
      addedEvidenceCount,
      confidence,
    });
  }

  if (mode === 'self-rag' && confidence < 0.78 && iterations < maxIterations) {
    iterations += 1;
    confidence = clamp(confidence + 0.06, 0, 1);
    trace.push({
      iteration: iterations,
      phase: 'revise',
      note: 'self_reflection_revision',
      confidence,
    });
  } else if (mode === 'rrr' && iterations < maxIterations) {
    iterations += 1;
    confidence = clamp(confidence + 0.04, 0, 1);
    trace.push({
      iteration: iterations,
      phase: 'revise',
      note: 'retrieve_read_refine',
      confidence,
    });
  } else {
    trace.push({
      iteration: iterations,
      phase: 'revise',
      note: 'single_pass_generation',
      confidence,
    });
  }

  const usedEvidence = workingEvidence.slice(0, 6);
  const citations = toCitations(usedEvidence);
  const answer = composeAnswer(input.query, citations);

  return {
    mode,
    answer,
    citations,
    iterations,
    confidence: Number(confidence.toFixed(4)),
    activeRetrievalTriggered,
    trace,
    usedEvidence,
  };
}
