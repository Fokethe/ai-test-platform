/**
 * RAG (Retrieval-Augmented Generation) Module
 * 知识库检索增强生成模块
 */

// 检索
export { BM25Search } from './retrieval/bm25-search';
export { HybridRetriever } from './retrieval/hybrid-retriever';

// 生成
export { CitationGenerator } from './generation/citation-generator';
export { SelfRAG } from './generation/self-rag';

// 查询
export { HyDEGenerator } from './query/hyde-generator';

// 缓存
export { SemanticCache, getSemanticCache } from './cache/semantic-cache';

// 主服务
export { RAGService, getRAGService } from './rag-service';
export type { RAGConfig, RAGQueryResult, IngestDocument } from './rag-service';
