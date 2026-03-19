import { RefinedEvidence } from '@/lib/ai/rag/retrieval-refinement';

export interface RerankedEvidence extends RefinedEvidence {
  rerankScore: number;
  rank: number;
  rationale: string[];
}

export interface RerankingResult {
  model: 'cross-encoder-lite';
  items: RerankedEvidence[];
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function lexicalScore(query: string, text: string): number {
  const qTokens = new Set(tokenize(query));
  const tTokens = new Set(tokenize(text));
  if (qTokens.size === 0 || tTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  qTokens.forEach((token) => {
    if (tTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / qTokens.size;
}

function phraseBoost(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 0;
  }
  return text.toLowerCase().includes(q) ? 0.12 : 0;
}

function sourceBoost(source: string): number {
  if (source === 'vector') {
    return 0.06;
  }
  if (source === 'graph') {
    return 0.05;
  }
  return 0.03;
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

export function rerankEvidence(input: {
  query: string;
  candidates: RefinedEvidence[];
  topN?: number;
}): RerankingResult {
  const topN = Math.max(1, Math.min(input.topN ?? 8, 30));

  const ranked = input.candidates
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.snippet}`;
      const lexical = lexicalScore(input.query, text);
      const phrase = phraseBoost(input.query, text);
      const source = sourceBoost(candidate.source);
      const rerankScore = Number(
        clamp(candidate.refinedScore * 0.68 + lexical * 0.22 + phrase + source, 0, 1).toFixed(4)
      );
      const rationale: string[] = [
        `lexical=${lexical.toFixed(2)}`,
        `refined=${candidate.refinedScore.toFixed(2)}`,
        `sourceBoost=${source.toFixed(2)}`,
      ];
      if (phrase > 0) {
        rationale.push('exact_phrase_match');
      }

      return {
        ...candidate,
        score: rerankScore,
        rerankScore,
        rank: 0,
        rationale,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topN)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return {
    model: 'cross-encoder-lite',
    items: ranked,
  };
}
