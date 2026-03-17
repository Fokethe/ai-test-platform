/**
 * BM25搜索引擎实现
 * 基于TF-IDF的BM25评分算法
 */

// BM25文档接口
export interface BM25Document {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

// BM25搜索结果接口
export interface BM25Result {
  document: BM25Document;
  score: number;
}

// 停用词列表
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
  "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去",
  "你", "会", "着", "没有", "看", "好", "自己", "这", "那",
  "these", "those", "am", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "dare", "ought", "used", "to", "of", "in", "for", "on", "with",
  "at", "by", "from", "as", "into", "through", "during", "before",
  "after", "above", "below", "between", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how",
  "all", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "just", "and", "but", "if", "or", "because", "until",
  "while", "a", "an", "the", "this", "that"
]);

/**
 * BM25搜索引擎类
 * 实现BM25评分算法的全文搜索引擎
 */
export class BM25Search {
  private documents: Map<string, BM25Document> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private termFrequency: Map<string, Map<string, number>> = new Map();
  private documentLength: Map<string, number> = new Map();
  private avgDocumentLength: number = 0;
  private totalDocumentLength: number = 0;

  private readonly k1: number = 1.5;
  private readonly b: number = 0.75;

  private tokenize(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ").trim();
    const tokens: string[] = [];
    const words = cleaned.split(/\s+/);
    for (const word of words) {
      if (!word) continue;
      if (/[\u4e00-\u9fa5]/.test(word)) {
        for (const char of word) {
          if (!STOP_WORDS.has(char) && /[\u4e00-\u9fa5]/.test(char)) tokens.push(char);
        }
      } else {
        if (!STOP_WORDS.has(word) && word.length > 1) tokens.push(word);
      }
    }
    return tokens;
  }

  private calculateIDF(term: string): number {
    const docCount = this.documents.size;
    if (docCount === 0) return 0;
    const postingList = this.invertedIndex.get(term);
    const docFreq = postingList ? postingList.size : 0;
    return Math.log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5));
  }

  indexDocuments(docs: BM25Document[]): void {
    for (const doc of docs) {
      if (this.documents.has(doc.id)) continue;
      this.documents.set(doc.id, doc);
      const tokens = this.tokenize(doc.text);
      const docLen = tokens.length;
      this.documentLength.set(doc.id, docLen);
      this.totalDocumentLength += docLen;
      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
        if (!this.invertedIndex.has(token)) this.invertedIndex.set(token, new Set());
        this.invertedIndex.get(token)!.add(doc.id);
      }
      this.termFrequency.set(doc.id, tfMap);
    }
    if (this.documents.size > 0) {
      this.avgDocumentLength = this.totalDocumentLength / this.documents.size;
    }
  }

  search(query: string, topK: number = 10): BM25Result[] {
    if (this.documents.size === 0 || !query.trim()) return [];
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];
    const scores = new Map<string, number>();
    for (const term of queryTokens) {
      const idf = this.calculateIDF(term);
      const postingList = this.invertedIndex.get(term);
      if (!postingList) continue;
      for (const docId of postingList) {
        const tf = this.termFrequency.get(docId)?.get(term) || 0;
        const docLen = this.documentLength.get(docId) || 0;
        const avgdl = this.avgDocumentLength || 1;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
        const termScore = idf * (numerator / denominator);
        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([docId, score]): BM25Result => ({ document: this.documents.get(docId)!, score }));
  }

  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.termFrequency.clear();
    this.documentLength.clear();
    this.avgDocumentLength = 0;
    this.totalDocumentLength = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    documentCount: number;
    avgDocumentLength: number;
    totalTerms: number;
  } {
    return {
      documentCount: this.documents.size,
      avgDocumentLength: this.avgDocumentLength,
      totalTerms: this.invertedIndex.size,
    };
  }
}

export default BM25Search;
