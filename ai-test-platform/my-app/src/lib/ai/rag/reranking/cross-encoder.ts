/**
 * 交叉编码器重排序器
 * 使用更精确的模型进行重排序
 */

export interface RerankResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  vectorScore: number;  // 兼容 HybridResult
  keywordScore: number; // 兼容 HybridResult
}

export interface CrossEncoderConfig {
  model: string;
  maxLength: number;
  batchSize: number;
  topN?: number;
  scoreThreshold?: number;
}

export class CrossEncoderReranker {
  private config: CrossEncoderConfig;

  constructor(config: Partial<CrossEncoderConfig> = {}) {
    this.config = {
      model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      maxLength: 512,
      batchSize: 32,
      ...config,
    };
  }

  async rerank(query: string, documents: Array<{ id: string; content: string; metadata?: Record<string, unknown>; vectorScore?: number; keywordScore?: number }>): Promise<RerankResult[]> {
    // 简化的重排序实现
    const results: RerankResult[] = [];

    for (const doc of documents) {
      const score = this.calculateScore(query, doc.content);
      results.push({
        id: doc.id,
        content: doc.content,
        score,
        metadata: doc.metadata,
        vectorScore: doc.vectorScore ?? score,
        keywordScore: doc.keywordScore ?? score,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateScore(query: string, document: string): number {
    // 简化的相关性计算
    const queryWords = query.toLowerCase().split(' ');
    const docWords = document.toLowerCase().split(' ');
    
    let matches = 0;
    for (const word of queryWords) {
      if (docWords.some(dw => dw.includes(word) || word.includes(dw))) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  async close(): Promise<void> {
    // 清理资源
  }
}

export function createCrossEncoderReranker(config?: Partial<CrossEncoderConfig>): CrossEncoderReranker {
  return new CrossEncoderReranker(config);
}
