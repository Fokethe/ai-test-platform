/**
 * RAG (Retrieval-Augmented Generation) 主服务
 * 整合所有RAG组件，提供统一的检索增强生成接口
 * 
 * 功能:
 * - 文档处理与索引
 * - 混合检索 (Dense + BM25)
 * - 查询重写与HyDE
 * - 结果重排序
 * - 引用生成与Self-RAG
 * - 语义缓存
 */

import { CollectionManager, getCollectionManager, CollectionCreateOptions } from './vector/collection-manager';
import { HybridRetriever } from './retrieval/hybrid-retriever';
import { CrossEncoderReranker } from './reranking/cross-encoder';
import { QueryRewriter } from './query/rewriter';
import { HyDEGenerator } from './query/hyde-generator';
import { CitationGenerator } from './generation/citation-generator';
import { SelfRAG, SelfRAGConfig, SelfRAGResult } from './generation/self-rag';
import { SemanticCache, getSemanticCache } from './cache/semantic-cache';
import { BM25Search } from './retrieval/bm25-search';
import { ChromaVectorStore } from './vector/chroma-store';
import { HybridResult } from './retrieval/hybrid-retriever';

export interface RAGConfig {
  // Collection配置
  departmentId: string;
  departmentName: string;
  projectId?: string;
  projectName?: string;

  // 检索配置
  topK?: number;
  rerankTopN?: number;
  enableHyDE?: boolean;
  enableQueryRewrite?: boolean;
  enableSelfRAG?: boolean;

  // 缓存配置
  enableCache?: boolean;
  cacheTTL?: number;

  // Self-RAG配置
  selfRAGConfig?: Partial<SelfRAGConfig>;
}

export interface RAGContext {
  query: string;
  rewrittenQuery?: string;
  retrievedResults: HybridResult[];
  rerankedResults?: HybridResult[];
  usedCache?: boolean;
  cacheHit?: boolean;
  retrievalTime: number;
}

export interface RAGQueryResult {
  answer: string;
  sources: RAGSource[];
  context: RAGContext;
  selfRAGResult?: SelfRAGResult;
  citations: string[];
}

export interface RAGSource {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface IngestDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export class RAGService {
  private config: Required<RAGConfig>;
  private collectionManager: CollectionManager;
  private hybridRetriever?: HybridRetriever;
  private reranker?: CrossEncoderReranker;
  private queryRewriter: QueryRewriter;
  private hydeGenerator: HyDEGenerator;
  private citationGenerator: CitationGenerator;
  private selfRAG?: SelfRAG;
  private semanticCache?: SemanticCache;
  private vectorStore?: ChromaVectorStore;
  private bm25Search?: BM25Search;

  constructor(config: RAGConfig) {
    this.config = {
      topK: 10,
      rerankTopN: 5,
      enableHyDE: true,
      enableQueryRewrite: true,
      enableSelfRAG: false,
      enableCache: true,
      cacheTTL: 3600,
      selfRAGConfig: {},
      ...config,
    } as Required<RAGConfig>;

    this.collectionManager = getCollectionManager();
    this.queryRewriter = new QueryRewriter();
    this.hydeGenerator = new HyDEGenerator();
    this.citationGenerator = new CitationGenerator();

    if (this.config.enableSelfRAG) {
      this.selfRAG = new SelfRAG(this.config.selfRAGConfig);
    }

    if (this.config.enableCache) {
      this.semanticCache = getSemanticCache();
    }
  }

  /**
   * 初始化RAG服务
   * 获取或创建Collection，初始化检索器
   */
  async initialize(): Promise<void> {
    const collectionOptions: CollectionCreateOptions = {
      departmentId: this.config.departmentId,
      departmentName: this.config.departmentName,
      projectId: this.config.projectId,
      projectName: this.config.projectName,
    };

    // 获取Collection
    this.vectorStore = await this.collectionManager.getOrCreateCollection(collectionOptions);

    // 初始化BM25搜索
    this.bm25Search = new BM25Search();

    // 初始化混合检索器
    this.hybridRetriever = new HybridRetriever({
      vectorStore: this.vectorStore,
      bm25Search: this.bm25Search,
      denseWeight: 0.7,
      sparseWeight: 0.3,
      rrfK: 60,
      topK: this.config.topK,
    });

    // 初始化重排序器
    this.reranker = new CrossEncoderReranker({
      topN: this.config.rerankTopN,
      scoreThreshold: 0.5,
    });
  }

  /**
   * 查询知识库
   * 完整的RAG流程：查询重写 → 检索 → 重排序 → 生成 → 引用
   */
  async query(query: string): Promise<RAGQueryResult> {
    const startTime = Date.now();

    // 1. 查询重写
    let processedQuery = query;
    if (this.config.enableQueryRewrite) {
      const rewritten = await this.queryRewriter.rewrite(query);
      processedQuery = rewritten.expanded || query;
    }

    // 2. 检查缓存
    if (this.config.enableCache && this.semanticCache) {
      const cachedResult = await this.checkCache(processedQuery);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // 3. 执行检索
    const retrievalResults = await this.retrieve(processedQuery);

    // 4. 重排序
    let finalResults = retrievalResults;
    if (this.reranker) {
      finalResults = await this.reranker.rerank(processedQuery, retrievalResults);
    }

    // 5. 生成回答
    let answer: string;
    let selfRAGResult: SelfRAGResult | undefined;

    if (this.config.enableSelfRAG && this.selfRAG) {
      // SelfRAG 需要上下文数组作为第二个参数
      const contextForSelfRAG = finalResults.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
      }));
      const selfRAGOutput = await this.selfRAG.generate(processedQuery, contextForSelfRAG);
      answer = selfRAGOutput.answer;
    } else {
      answer = await this.generateAnswer(processedQuery, finalResults);
    }

    // 6. 生成引用
    const citationContext = this.citationGenerator.generateCitations(finalResults);
    answer = this.citationGenerator.addCitationsToText(answer, citationContext.citations);

    const retrievalTime = Date.now() - startTime;

    const result: RAGQueryResult = {
      answer,
      sources: finalResults.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
        metadata: r.metadata,
      })),
      context: {
        query,
        rewrittenQuery: processedQuery !== query ? processedQuery : undefined,
        retrievedResults: retrievalResults,
        rerankedResults: finalResults,
        usedCache: false,
        cacheHit: false,
        retrievalTime,
      },
      selfRAGResult,
      citations: citationContext.citations.map(c => c.content),
    };

    // 7. 缓存结果
    if (this.config.enableCache && this.semanticCache) {
      await this.cacheResult(processedQuery, result);
    }

    return result;
  }

  /**
   * 文档摄入
   * 将文档添加到知识库索引
   */
  async ingest(documents: IngestDocument[]): Promise<void> {
    if (!this.hybridRetriever) {
      throw new Error('RAG服务未初始化');
    }

    // 准备文档格式
    const docs = documents.map(doc => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
    }));

    // 添加到混合检索器（同时添加到向量存储和BM25）
    await this.hybridRetriever.addDocuments(docs);
  }

  /**
   * 执行检索
   */
  private async retrieve(query: string): Promise<HybridResult[]> {
    if (!this.hybridRetriever) {
      throw new Error('RAG服务未初始化');
    }

    // HyDE增强检索
    if (this.config.enableHyDE) {
      const hydeDocs = await this.hydeGenerator.generateHypotheticalDocs(query);
      if (hydeDocs.length > 0) {
        // 使用假设文档进行扩展检索
        const allResults: HybridResult[] = [];
        for (const hydeDoc of hydeDocs) {
          const results = await this.hybridRetriever.hybridSearch(hydeDoc, { topK: 5 });
          allResults.push(...results);
        }
        // 去重并排序
        return this.deduplicateAndSortResults(allResults);
      }
    }

    return this.hybridRetriever.hybridSearch(query);
  }

  /**
   * 生成回答
   */
  private async generateAnswer(query: string, context: HybridResult[]): Promise<string> {
    // 简化的回答生成 - 实际应调用LLM
    const contextText = context
      .slice(0, 3)
      .map((c, i) => `[${i + 1}] ${c.content.substring(0, 500)}`)
      .join('\n\n');

    return `基于检索到的信息，关于"${query}"的回答如下：

${contextText}

[注：此处应调用LLM生成完整回答]`;
  }

  /**
   * 检查缓存
   */
  private async checkCache(query: string): Promise<RAGQueryResult | null> {
    if (!this.semanticCache) return null;

    try {
      // 生成查询的embedding进行缓存匹配
      const queryEmbedding = await this.generateQueryEmbedding(query);
      const cached = await this.semanticCache.get(query, queryEmbedding);

      if (cached) {
        const cachedResult = cached as RAGQueryResult;
        return {
          ...cachedResult,
          context: {
            ...cachedResult.context,
            cacheHit: true,
          },
        };
      }
    } catch (error) {
      console.error('缓存查询失败:', error);
    }

    return null;
  }

  /**
   * 缓存结果
   */
  private async cacheResult(query: string, result: RAGQueryResult): Promise<void> {
    if (!this.semanticCache) return;

    try {
      const queryEmbedding = await this.generateQueryEmbedding(query);
      await this.semanticCache.set(query, queryEmbedding, result);
    } catch (error) {
      console.error('缓存存储失败:', error);
    }
  }

  /**
   * 生成查询embedding
   * 使用简化的方式，实际应调用embedding服务
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // 简化实现：使用词频向量作为embedding的替代
    // 实际应调用embedding模型
    const words = query.toLowerCase().split(/\s+/);
    const embedding: number[] = [];
    const vocabSize = 100;

    for (let i = 0; i < vocabSize; i++) {
      embedding[i] = 0;
    }

    for (const word of words) {
      const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      embedding[hash % vocabSize] += 1;
    }

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(v => (norm > 0 ? v / norm : 0));
  }

  /**
   * 去重并排序结果
   */
  private deduplicateAndSortResults(results: HybridResult[]): HybridResult[] {
    const seen = new Set<string>();
    const unique: HybridResult[] = [];

    for (const result of results) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        unique.push(result);
      }
    }

    return unique.sort((a, b) => b.score - a.score);
  }

  /**
   * 关闭RAG服务
   */
  async close(): Promise<void> {
    if (this.hybridRetriever) {
      await this.hybridRetriever.close();
    }
    if (this.reranker) {
      await this.reranker.close();
    }
  }
}

// 服务实例缓存
const serviceInstances: Map<string, RAGService> = new Map();

/**
 * 获取RAG服务实例
 */
export function getRAGService(config: RAGConfig): RAGService {
  const key = `${config.departmentId}_${config.projectId || 'default'}`;

  if (!serviceInstances.has(key)) {
    serviceInstances.set(key, new RAGService(config));
  }

  return serviceInstances.get(key)!;
}

/**
 * 重置RAG服务实例
 */
export function resetRAGService(departmentId: string, projectId?: string): void {
  const key = `${departmentId}_${projectId || 'default'}`;
  serviceInstances.delete(key);
}

export default RAGService;
