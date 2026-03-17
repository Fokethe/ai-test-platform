/**
 * RAG (Retrieval-Augmented Generation) Module
 * 知识库检索增强生成模块
 * 
 * 功能:
 * - 文档处理与向量化
 * - 语义检索与重排序
 * - 混合检索 (Dense + BM25)
 * - 查询理解与重写
 * - 引用溯源与事实验证
 */

// 向量存储与Collection管理
export { ChromaVectorStore, createChromaStore } from './vector/chroma-store';
export { CollectionManager, getCollectionManager } from './vector/collection-manager';
export type { VectorStoreConfig, HNSWIndexConfig, SearchResult } from './vector/vector-store';
export type { CollectionInfo, CollectionCreateOptions } from './vector/collection-manager';

// 检索与重排序
export { HybridRetriever } from './retrieval/hybrid-retriever';
export { CrossEncoderReranker } from './reranking/cross-encoder';

// 文档处理
export { DocumentProcessor } from './document-processor';

// 查询处理
export { QueryRewriter } from './query/rewriter';
export { HyDEGenerator } from './query/hyde-generator';

// 生成与验证
export { CitationGenerator } from './generation/citation-generator';
export { SelfRAG } from './generation/self-rag';

// 缓存
export { SemanticCache, getSemanticCache } from './cache/semantic-cache';

// 主RAG服务
export { RAGService } from './rag-service';
export type { RAGConfig, RAGQueryResult, RAGContext } from './rag-service';
