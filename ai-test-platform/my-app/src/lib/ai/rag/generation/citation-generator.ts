/**
 * 引用生成器
 * 为RAG结果生成引用标注
 */

export interface Citation {
  id: string;
  source: string;
  content: string;
  page?: number;
}

export interface CitationContext {
  citations: Citation[];
  formattedText: string;
}

export class CitationGenerator {
  private citationCounter = 0;

  generateCitations(sources: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>): CitationContext {
    this.citationCounter = 0;
    const citations: Citation[] = [];
    
    for (const source of sources) {
      this.citationCounter++;
      citations.push({
        id: `[${this.citationCounter}]`,
        source: String(source.metadata?.source || source.metadata?.title || '未知来源'),
        content: source.content.substring(0, 200) + '...',
        page: source.metadata?.page ? Number(source.metadata.page) : undefined,
      });
    }

    const formattedText = citations.map(c => 
      `${c.id} ${c.source}${c.page ? ` (p.${c.page})` : ''}: ${c.content}`
    ).join('\n');

    return { citations, formattedText };
  }

  addCitationMarkers(text: string, citationIds: string[]): string {
    return citationIds.reduce((acc, id, index) => {
      return acc + ` [${index + 1}]`;
    }, text);
  }

  addCitationsToText(text: string, citations: Citation[]): string {
    // 简化实现：在文本末尾添加引用列表
    if (citations.length === 0) return text;
    
    const citationList = citations.map(c => c.id).join('');
    return `${text}\n\n[引用]: ${citationList}`;
  }
}

export function createCitationGenerator(): CitationGenerator {
  return new CitationGenerator();
}
