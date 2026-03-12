/**
 * Reranker Types
 * 数学自定叓尾st/types/reranker/ts
 * Phase 2.3 - Reranker Layer
 */

export interface Document {
  id: string
  content: string
  metadata?: Record<string, unknown>
  score?: number
}

export interface RerankResult {
  document: Document
  score: number
  rank: number
}

export interface RerankerOptions {
  initialTopK?: number
  finalTopK?: number
  model?: string
  serviceUrl?: string
  enableCache?: boolean
  cacheTtl?: number
  batchSize?: number
  timeout?: number
}

export interface ReranderingServiceStats {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  avgLatency: number
  p95Latency: number
  p99Latency: number
}

export interface RerankCacheEntry {
  query: string
  documentIds: string[]
  results: RerankResult[]
  timestamp: number
}