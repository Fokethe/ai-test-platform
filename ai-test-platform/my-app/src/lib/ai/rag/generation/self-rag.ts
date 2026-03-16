/**
 * Self-RAG (Self-Reflective RAG)
 * 自反思检索增强生成
 * 
 * 功能:
 * - 检索结果自我评估
 * - 事实验证与一致性检查
 * - 动态决定是否需要进一步检索
 * - 生成质量自我评分
 */

import { HybridResult } from '../retrieval/hybrid-retriever';

export interface FactCheckResult {
  claim: string;
  supported: boolean;
  confidence: number;
  evidence: string[];
  contradictions: string[];
}

export interface SelfRAGEvaluation {
  relevanceScore: number;
  completenessScore: number;
  consistencyScore: number;
  overallScore: number;
  needsMoreRetrieval: boolean;
  suggestions: string[];
}

export interface SelfRAGResult {
  text: string;
  citations: string[];
  evaluation: SelfRAGEvaluation;
  factChecks: FactCheckResult[];
  retrievalRounds: number;
}

export interface SelfRAGConfig {
  maxRetrievalRounds: number;
  minRelevanceScore: number;
  minCompletenessScore: number;
  enableFactCheck: boolean;
  reflectionDepth: 'light' | 'medium' | 'deep';
}

export class SelfRAG {
  private config: SelfRAGConfig;

  constructor(config: Partial<SelfRAGConfig> = {}) {
    this.config = {
      maxRetrievalRounds: 3,
      minRelevanceScore: 0.7,
      minCompletenessScore: 0.6,
      enableFactCheck: true,
      reflectionDepth: 'medium',
      ...config,
    };
  }

  /**
   * 执行Self-RAG生成
   * 包含多轮检索和自我反思
   */
  async generate(
    query: string,
    retrieveFn: (query: string) => Promise<HybridResult[]>,
    generateFn: (query: string, context: HybridResult[]) => Promise<string>,
    evaluateFn?: (text: string, context: HybridResult[]) => Promise<SelfRAGEvaluation>
  ): Promise<SelfRAGResult> {
    let retrievalRounds = 0;
    let allResults: HybridResult[] = [];
    let generatedText = '';
    let evaluation: SelfRAGEvaluation;

    // 多轮检索循环
    while (retrievalRounds < this.config.maxRetrievalRounds) {
      retrievalRounds++;

      // 执行检索
      const results = await retrieveFn(query);
      allResults = this.mergeResults(allResults, results);

      // 生成回答
      generatedText = await generateFn(query, allResults);

      // 自我评估
      evaluation = evaluateFn
        ? await evaluateFn(generatedText, allResults)
        : this.evaluateGeneratedText(generatedText, allResults, query);

      // 检查是否需要更多检索
      if (!evaluation.needsMoreRetrieval || retrievalRounds >= this.config.maxRetrievalRounds) {
        break;
      }

      // 基于评估结果优化查询
      query = this.refineQuery(query, evaluation);
    }

    // 事实验证
    const factChecks = this.config.enableFactCheck
      ? await this.checkFacts(generatedText, allResults)
      : [];

    return {
      text: generatedText,
      citations: this.extractCitations(generatedText),
      evaluation: evaluation!,
      factChecks,
      retrievalRounds,
    };
  }

  /**
   * 合并检索结果，去重
   */
  private mergeResults(
    existing: HybridResult[],
    newResults: HybridResult[]
  ): HybridResult[] {
    const seen = new Set(existing.map(r => r.id));
    const merged = [...existing];

    for (const result of newResults) {
      if (!seen.has(result.id)) {
        merged.push(result);
        seen.add(result.id);
      }
    }

    return merged.sort((a, b) => b.score - a.score);
  }

  /**
   * 评估生成文本质量
   */
  private evaluateGeneratedText(
    text: string,
    context: HybridResult[],
    query: string
  ): SelfRAGEvaluation {
    // 相关性评分
    const relevanceScore = this.calculateRelevance(text, context, query);

    // 完整性评分
    const completenessScore = this.calculateCompleteness(text, context);

    // 一致性评分
    const consistencyScore = this.calculateConsistency(text, context);

    // 综合评分
    const overallScore = (relevanceScore + completenessScore + consistencyScore) / 3;

    // 判断是否需要更多检索
    const needsMoreRetrieval =
      relevanceScore < this.config.minRelevanceScore ||
      completenessScore < this.config.minCompletenessScore;

    // 生成改进建议
    const suggestions = this.generateSuggestions(
      relevanceScore,
      completenessScore,
      consistencyScore
    );

    return {
      relevanceScore,
      completenessScore,
      consistencyScore,
      overallScore,
      needsMoreRetrieval,
      suggestions,
    };
  }

  /**
   * 计算相关性评分
   */
  private calculateRelevance(text: string, context: HybridResult[], query: string): number {
    const queryTerms = this.tokenize(query);
    const textTerms = this.tokenize(text);

    let matchedTerms = 0;
    for (const term of queryTerms) {
      if (textTerms.includes(term)) {
        matchedTerms++;
      }
    }

    const queryRelevance = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;

    // 检查是否使用了检索到的上下文
    const contextUsage = context.length > 0
      ? Math.min(context.filter(c => text.includes(c.content.substring(0, 50))).length / context.length, 1)
      : 0;

    return queryRelevance * 0.6 + contextUsage * 0.4;
  }

  /**
   * 计算完整性评分
   */
  private calculateCompleteness(text: string, context: HybridResult[]): number {
    if (context.length === 0) return 0;

    const textTerms = new Set(this.tokenize(text));
    let totalCoverage = 0;

    for (const result of context) {
      const contextTerms = this.tokenize(result.content);
      if (contextTerms.length === 0) continue;

      let matched = 0;
      for (const term of contextTerms) {
        if (textTerms.has(term)) {
          matched++;
        }
      }
      totalCoverage += matched / contextTerms.length;
    }

    return Math.min(totalCoverage / Math.min(context.length, 5), 1);
  }

  /**
   * 计算一致性评分
   */
  private calculateConsistency(text: string, context: HybridResult[]): number {
    // 简单的长度检查作为一致性代理
    const hasReasonableLength = text.length >= 50 && text.length <= 5000;
    const hasProperStructure = text.includes('。') || text.includes('.') || text.includes('\n');

    let score = 0;
    if (hasReasonableLength) score += 0.5;
    if (hasProperStructure) score += 0.3;

    // 检查是否有明显矛盾
    const contradictions = this.detectContradictions(text, context);
    score += Math.max(0, 0.2 - contradictions.length * 0.05);

    return Math.min(score, 1);
  }

  /**
   * 检测文本中的矛盾
   */
  private detectContradictions(text: string, context: HybridResult[]): number {
    // 简化的矛盾检测 - 检查否定词
    const negationPatterns = [/不是/g, /没有/g, /不/g, /否/g, /非/g, /not/gi, /no /gi];
    let contradictions = 0;

    for (const pattern of negationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        contradictions += matches.length;
      }
    }

    return Math.min(contradictions, 5);
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(
    relevanceScore: number,
    completenessScore: number,
    consistencyScore: number
  ): string[] {
    const suggestions: string[] = [];

    if (relevanceScore < 0.7) {
      suggestions.push('回答与查询相关性不足，建议更聚焦于用户问题');
    }

    if (completenessScore < 0.6) {
      suggestions.push('回答不够完整，建议包含更多检索到的信息');
    }

    if (consistencyScore < 0.6) {
      suggestions.push('回答结构需要优化，建议增加逻辑清晰度');
    }

    return suggestions;
  }

  /**
   * 基于评估结果优化查询
   */
  private refineQuery(originalQuery: string, evaluation: SelfRAGEvaluation): string {
    if (evaluation.relevanceScore < this.config.minRelevanceScore) {
      return `${originalQuery} (需要更相关的信息)`;
    }

    if (evaluation.completenessScore < this.config.minCompletenessScore) {
      return `${originalQuery} (需要更详细的内容)`;
    }

    return originalQuery;
  }

  /**
   * 事实检查
   */
  private async checkFacts(
    text: string,
    context: HybridResult[]
  ): Promise<FactCheckResult[]> {
    const claims = this.extractClaims(text);
    const factChecks: FactCheckResult[] = [];

    for (const claim of claims) {
      const checkResult = this.verifyClaim(claim, context);
      factChecks.push(checkResult);
    }

    return factChecks;
  }

  /**
   * 从文本中提取声明
   */
  private extractClaims(text: string): string[] {
    // 简单句子分割
    const sentences = text
      .replace(/([.!?。！？])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    return sentences.slice(0, 5); // 最多检查5个声明
  }

  /**
   * 验证单个声明
   */
  private verifyClaim(claim: string, context: HybridResult[]): FactCheckResult {
    const claimTerms = this.tokenize(claim);
    const evidence: string[] = [];
    const contradictions: string[] = [];

    for (const result of context) {
      const contextTerms = this.tokenize(result.content);
      let matchedTerms = 0;

      for (const term of claimTerms) {
        if (contextTerms.includes(term)) {
          matchedTerms++;
        }
      }

      const overlap = claimTerms.length > 0 ? matchedTerms / claimTerms.length : 0;

      if (overlap > 0.5) {
        evidence.push(result.content.substring(0, 200));
      } else if (overlap < 0.1 && this.hasContradictionTerms(claim, result.content)) {
        contradictions.push(result.content.substring(0, 200));
      }
    }

    const confidence = evidence.length / (evidence.length + contradictions.length + 1);
    const supported = evidence.length > contradictions.length && confidence > 0.5;

    return {
      claim,
      supported,
      confidence: Math.min(confidence, 1),
      evidence: evidence.slice(0, 3),
      contradictions: contradictions.slice(0, 2),
    };
  }

  /**
   * 检查是否有矛盾词
   */
  private hasContradictionTerms(claim: string, context: string): boolean {
    const negations = ['不', '没', '非', '无', 'not', 'no', 'never'];
    const hasNegationInClaim = negations.some(n => claim.includes(n));
    const hasNegationInContext = negations.some(n => context.includes(n));

    return hasNegationInClaim !== hasNegationInContext;
  }

  /**
   * 提取引用标记
   */
  private extractCitations(text: string): string[] {
    const citationPattern = /\[来源\s*\d+\]|[\(\[]\d+[\)\]]/g;
    return text.match(citationPattern) || [];
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }
}

export default SelfRAG;
