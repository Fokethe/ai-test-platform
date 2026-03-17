/**
 * 引用生成器
 * 为检索结果生成引用标记
 */

import { HybridResult } from '../retrieval/hybrid-retriever';

export interface Citation {
  id: string;
  number: number;
  documentId: string;
  text: string;
  score: number;
  source?: string;
}

export class CitationGenerator {
  private counter = 0;

  /**
   * 生成引用
   */
  generateCitations(results: HybridResult[]): Citation[] {
    return results.map((result, index) => ({
      id: `cite-${index + 1}`,
      number: index + 1,
      documentId: result.id,
      text: `[${index + 1}]`,
      score: result.score,
      source: result.metadata?.source as string,
    }));
  }

  /**
   * 添加引用到文本
   */
  addCitationsToText(text: string, citations: Citation[]): string {
    // 简单实现：在文本末尾添加引用列表
    if (citations.length === 0) return text;
    
    const citationList = citations.map(c => `${c.text} ${c.documentId}`).join(', ');
    return `${text}\n\n来源: ${citationList}`;
  }

  /**
   * 格式化单个引用
   */
  formatCitation(citation: Citation, format: 'number' | 'markdown' = 'number'): string {
    if (format === 'markdown') {
      return `[^${citation.number}]`;
    }
    return citation.text;
  }

  /**
   * 重置计数器
   */
  resetCounter(): void {
    this.counter = 0;
  }
}

export default CitationGenerator;
