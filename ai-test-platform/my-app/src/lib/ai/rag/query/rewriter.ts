/**
 * 查询重写器
 * 优化用户查询以提高检索效果
 */

export interface RewriteResult {
  original: string;
  rewritten: string;
  expansions: string[];
}

export class QueryRewriter {
  async rewrite(query: string): Promise<RewriteResult> {
    const expansions = this.generateExpansions(query);
    const rewritten = this.optimizeQuery(query);
    
    return {
      original: query,
      rewritten,
      expansions,
    };
  }

  private generateExpansions(query: string): string[] {
    const expansions: string[] = [];
    
    // 添加同义词扩展
    const synonyms = this.getSynonyms(query);
    if (synonyms.length > 0) {
      expansions.push(...synonyms);
    }
    
    // 添加语义扩展
    const semanticVariants = this.getSemanticVariants(query);
    expansions.push(...semanticVariants);
    
    return expansions.slice(0, 5);
  }

  private optimizeQuery(query: string): string {
    // 移除停用词
    let optimized = query.replace(/\b(的|是|在|有|和|或|但|如果|那么)\b/g, ' ');
    
    // 规范化空格
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }

  private getSynonyms(query: string): string[] {
    // 简化的同义词映射
    const synonymMap: Record<string, string[]> = {
      '测试': ['检验', '验证', '检查'],
      '错误': ['缺陷', 'bug', '问题', '故障'],
      '功能': ['特性', 'feature', '能力'],
    };
    
    const results: string[] = [];
    for (const [key, values] of Object.entries(synonymMap)) {
      if (query.includes(key)) {
        results.push(...values.map(v => query.replace(key, v)));
      }
    }
    
    return results;
  }

  private getSemanticVariants(query: string): string[] {
    // 生成语义变体
    const variants: string[] = [];
    
    // 添加疑问形式
    if (!query.includes('如何') && !query.includes('怎么')) {
      variants.push(`如何使用 ${query}`);
    }
    
    // 添加定义形式
    variants.push(`什么是 ${query}`);
    
    return variants;
  }
}

export function createQueryRewriter(): QueryRewriter {
  return new QueryRewriter();
}
