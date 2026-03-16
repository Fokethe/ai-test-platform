import { BM25Search, BM25Document, BM25Result } from './bm25-search';

export interface VectorResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorStore {
  similaritySearch(query: string, topK?: number): Promise<VectorResult[]>;
}

export interface HybridResult {
  document: BM25Document;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
  sources: ('vector' | 'bm25')[];
}

export interface HybridOptions {
  vectorWeight?: number;
  bm25Weight?: number;
  fusionMethod?: 'rrf' | 'weighted';
  rrfK?: number;
  topK?: number;
}

interface HybridRetrieverConfig {
  vectorStore: VectorStore;
  bm25Search: BM25Search;
  options?: HybridOptions;
}

export class HybridRetriever {
  private vectorStore: VectorStore;
  private bm25Search: BM25Search;
  private options: Required<HybridOptions>;

  constructor(config: HybridRetrieverConfig) {
    this.vectorStore = config.vectorStore;
    this.bm25Search = config.bm25Search;
    this.options = {
      vectorWeight: config.options?.vectorWeight ?? 0.5,
      bm25Weight: config.options?.bm25Weight ?? 0.5,
      fusionMethod: config.options?.fusionMethod ?? 'rrf',
      rrfK: config.options?.rrfK ?? 60,
      topK: config.options?.topK ?? 10,
    };
  }

  async retrieve(query: string): Promise<HybridResult[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    // Run both searches in parallel
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorSearch(query),
      this.bm25SearchMethod(query),
    ]);

    // Fuse results
    const fusedResults = this.fuseResults(vectorResults, bm25Results);

    // Return top K results
    return fusedResults.slice(0, this.options.topK);
  }

  private async vectorSearch(query: string): Promise<Map<string, VectorResult>> {
    const results = await this.vectorStore.similaritySearch(query, this.options.topK * 2);
    const resultMap = new Map<string, VectorResult>();
    for (const result of results) {
      resultMap.set(result.id, result);
    }
    return resultMap;
  }

  private bm25SearchMethod(query: string): Map<string, BM25Result> {
    const results = this.bm25Search.search(query, this.options.topK * 2);
    const resultMap = new Map<string, BM25Result>();
    for (const result of results) {
      resultMap.set(result.document.id, result);
    }
    return resultMap;
  }

  private fuseResults(
    vectorResults: Map<string, VectorResult>,
    bm25Results: Map<string, BM25Result>
  ): HybridResult[] {
    const allDocIds = new Set([...vectorResults.keys(), ...bm25Results.keys()]);
    const fusedResults: HybridResult[] = [];

    for (const docId of allDocIds) {
      const vectorResult = vectorResults.get(docId);
      const bm25Result = bm25Results.get(docId);

      let score: number;
      let vectorScore: number | undefined;
      let bm25Score: number | undefined;
      const sources: ('vector' | 'bm25')[] = [];

      if (this.options.fusionMethod === 'rrf') {
        score = this.calculateRRFScore(
          vectorResult,
          bm25Result,
          vectorResults.size,
          bm25Results.size
        );
      } else {
        score = this.calculateWeightedScore(vectorResult, bm25Result);
      }

      if (vectorResult) {
        vectorScore = vectorResult.score;
        sources.push('vector');
      }
      if (bm25Result) {
        bm25Score = bm25Result.score;
        sources.push('bm25');
      }

      const document = vectorResult
        ? { id: vectorResult.id, text: vectorResult.text, metadata: vectorResult.metadata }
        : bm25Result!.document;

      fusedResults.push({
        document,
        score,
        vectorScore,
        bm25Score,
        sources,
      });
    }

    // Sort by score descending
    fusedResults.sort((a, b) => b.score - a.score);
    return fusedResults;
  }

  private calculateRRFScore(
    vectorResult: VectorResult | undefined,
    bm25Result: BM25Result | undefined,
    totalVectorResults: number,
    totalBm25Results: number
  ): number {
    let score = 0;

    if (vectorResult) {
      // Calculate rank (position in sorted results)
      // Since we don't have direct rank info, we estimate from the score
      const rank = this.estimateRank(vectorResult.score, totalVectorResults);
      score += 1 / (this.options.rrfK + rank);
    }

    if (bm25Result) {
      const rank = this.estimateRank(bm25Result.score, totalBm25Results);
      score += 1 / (this.options.rrfK + rank);
    }

    return score;
  }

  private estimateRank(score: number, totalResults: number): number {
    // Simple estimation: higher score = lower rank number
    // This is a simplification; in practice, you'd track actual ranks
    const normalizedScore = Math.min(Math.max(score, 0), 1);
    return Math.floor((1 - normalizedScore) * totalResults) + 1;
  }

  private calculateWeightedScore(
    vectorResult: VectorResult | undefined,
    bm25Result: BM25Result | undefined
  ): number {
    let score = 0;
    let totalWeight = 0;

    if (vectorResult) {
      score += vectorResult.score * this.options.vectorWeight;
      totalWeight += this.options.vectorWeight;
    }

    if (bm25Result) {
      score += bm25Result.score * this.options.bm25Weight;
      totalWeight += this.options.bm25Weight;
    }

    // Normalize by total weight if not all sources present
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  updateOptions(options: Partial<HybridOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): HybridOptions {
  return { ...this.options };
  }
}
