/**
 * 混合检索器
 * 结合向量检索和关键词检索
 */

import type { SearchResult } from '../vector/vector-store';

export interface HybridResult extends SearchResult {
  vectorScore: number;
  keywordScore: number;
}

export interface HybridRetrieverConfig {
  vectorWeight: number;
  keywordWeight: number;
  k: number;
  vectorStore?: unknown;
  bm25Search?: unknown;
  denseWeight?: number;
  sparseWeight?: number;
  rrfK?: number;
  topK?: number;
}

export interface HybridSearchOptions {
  topK?: number;
}

export class HybridRetriever {
  private config: HybridRetrieverConfig;

  constructor(config: Partial<HybridRetrieverConfig> = {}) {
    this.config = {
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      k: 10,
      ...config,
    };
  }

  async retrieve(
    query: string,
    vectorResults: SearchResult[],
    keywordResults: SearchResult[]
  ): Promise<HybridResult[]> {
    const combined = this.combineResults(vectorResults, keywordResults);
    const reranked = this.rerank(combined);
    return reranked.slice(0, this.config.k);
  }

  // 混合检索（向量 + BM25）
  async hybridSearch(query: string, options?: HybridSearchOptions): Promise<HybridResult[]> {
    // 简化实现，实际应结合向量检索和BM25
    return [];
  }

  // 添加文档
  async addDocuments(docs: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>): Promise<void> {
    // 简化实现
  }

  // 关闭资源
  async close(): Promise<void> {
    // 清理资源
  }

  private combineResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[]
  ): Map<string, HybridResult> {
    const combined = new Map<string, HybridResult>();

    // 处理向量检索结果
    for (let i = 0; i < vectorResults.length; i++) {
      const result = vectorResults[i];
      const normalizedScore = 1 - (i / vectorResults.length);
      combined.set(result.id, {
        ...result,
        vectorScore: normalizedScore,
        keywordScore: 0,
      });
    }

    // 处理关键词检索结果
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const normalizedScore = 1 - (i / keywordResults.length);
      
      if (combined.has(result.id)) {
        const existing = combined.get(result.id)!;
        existing.keywordScore = normalizedScore;
      } else {
        combined.set(result.id, {
          ...result,
          vectorScore: 0,
          keywordScore: normalizedScore,
        });
      }
    }

    return combined;
  }

  private rerank(results: Map<string, HybridResult>): HybridResult[] {
    const scored = Array.from(results.values()).map((result) => ({
      ...result,
      score: 
        result.vectorScore * this.config.vectorWeight +
        result.keywordScore * this.config.keywordWeight,
    }));

    return scored.sort((a, b) => b.score - a.score);
  }
}

export function createHybridRetriever(config?: Partial<HybridRetrieverConfig>): HybridRetriever {
  return new HybridRetriever(config);
}
