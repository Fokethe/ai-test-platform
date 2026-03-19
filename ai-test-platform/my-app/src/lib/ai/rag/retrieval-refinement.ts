import { QueryCandidate, QuerySource } from '@/lib/ai/rag/multi-source-query';

export interface RefinementExplainability {
  evidenceId: string;
  source: QuerySource;
  baseScore: number;
  overlapScore: number;
  sourceReliability: number;
  freshnessBoost: number;
  finalScore: number;
  overlapTokens: string[];
}

export interface RefinedEvidence extends QueryCandidate {
  refinedScore: number;
  reasonSummary: string;
}

export interface RetrievalRefinementResult {
  items: RefinedEvidence[];
  explainability: RefinementExplainability[];
  coverage: number;
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

function sourceReliability(source: QuerySource): number {
  if (source === 'vector') {
    return 0.94;
  }
  if (source === 'graph') {
    return 0.9;
  }
  return 0.86;
}

function freshnessBoost(metadata?: Record<string, unknown>, now = new Date()): number {
  const updatedAtRaw = metadata?.updatedAt;
  if (!updatedAtRaw) {
    return 0;
  }
  const updatedAt = new Date(String(updatedAtRaw));
  if (Number.isNaN(updatedAt.getTime())) {
    return 0;
  }
  const days = Math.max(0, (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  return clamp(0.08 - days * 0.002, 0, 0.08);
}

function overlapTokens(query: string, text: string): string[] {
  const qTokens = new Set(tokenize(query));
  const tTokens = new Set(tokenize(text));
  return Array.from(qTokens).filter((token) => tTokens.has(token));
}

function toCoverage(query: string, texts: string[]): number {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) {
    return 0;
  }

  const covered = new Set<string>();
  texts.forEach((text) => {
    const tokens = new Set(tokenize(text));
    qTokens.forEach((token) => {
      if (tokens.has(token)) {
        covered.add(token);
      }
    });
  });

  return Number((covered.size / qTokens.length).toFixed(4));
}

export function refineRetrievalEvidence(input: {
  query: string;
  candidates: QueryCandidate[];
  topK?: number;
  now?: Date;
}): RetrievalRefinementResult {
  const topK = Math.max(1, Math.min(input.topK ?? 10, 30));
  const now = input.now ?? new Date();

  const deduped = new Map<string, QueryCandidate>();
  for (const candidate of input.candidates) {
    const existing = deduped.get(candidate.id);
    if (!existing || candidate.score > existing.score) {
      deduped.set(candidate.id, candidate);
    }
  }

  const explainability: RefinementExplainability[] = [];
  const items: RefinedEvidence[] = Array.from(deduped.values())
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.snippet}`.trim();
      const tokens = overlapTokens(input.query, text);
      const overlapScore = tokens.length === 0 ? 0 : clamp(tokens.length / tokenize(input.query).length, 0, 1);
      const baseScore = clamp(candidate.score, 0, 1);
      const reliability = sourceReliability(candidate.source);
      const freshness = freshnessBoost(candidate.metadata, now);
      const refinedScore = Number(
        clamp(baseScore * 0.62 + overlapScore * 0.23 + reliability * 0.1 + freshness * 0.05, 0, 1).toFixed(4)
      );
      const reasonSummary = `overlap=${overlapScore.toFixed(2)} source=${candidate.source} freshness=${freshness.toFixed(2)}`;

      explainability.push({
        evidenceId: candidate.id,
        source: candidate.source,
        baseScore: Number(baseScore.toFixed(4)),
        overlapScore: Number(overlapScore.toFixed(4)),
        sourceReliability: Number(reliability.toFixed(4)),
        freshnessBoost: Number(freshness.toFixed(4)),
        finalScore: refinedScore,
        overlapTokens: tokens,
      });

      return {
        ...candidate,
        score: refinedScore,
        refinedScore,
        reasonSummary,
      };
    })
    .sort((a, b) => b.refinedScore - a.refinedScore)
    .slice(0, topK);

  return {
    items,
    explainability: explainability
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK),
    coverage: toCoverage(
      input.query,
      items.map((item) => `${item.title} ${item.snippet}`)
    ),
  };
}
