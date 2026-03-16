/**
 * 向量存储接口定义
 * HNSW 向量索引抽象层
 */

export interface Document {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  id: string
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface VectorStoreConfig {
  collectionName: string
  dimension: number
  distance?: 'cosine' | 'euclidean' | 'dot'
}

export interface HNSWIndexConfig {
  M: number
  efConstruction: number
  efSearch?: number
}

export interface VectorStore {
  initialize(config: VectorStoreConfig, hnswConfig?: HNSWIndexConfig): Promise<void>
  add(documents: Document[]): Promise<void>
  search(query: number[], k: number): Promise<SearchResult[]>
  delete(ids: string[]): Promise<void>
  clear(): Promise<void>
  close(): Promise<void>
}
