/**
 * ChromaDB 向量存储实现
 * HNSW 索引配置 (M=16, efConstruction=200)
 * 目标检索速度 < 50ms
 */

import type {
  Document,
  SearchResult,
  VectorStore,
  VectorStoreConfig,
  HNSWIndexConfig,
} from './vector-store';

interface ChromaClient {
  getOrCreateCollection(options: {
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<ChromaCollection>;
}

interface ChromaCollection {
  add(options: {
    ids: string[];
    documents: string[];
    embeddings: number[][];
    metadatas?: Record<string, unknown>[];
  }): Promise<void>;
  query(options: {
    queryEmbeddings: number[][];
    nResults: number;
  }): Promise<ChromaQueryResult>;
  delete(options: { ids: string[] }): Promise<void>;
  count(): Promise<number>;
}

interface ChromaQueryResult {
  ids: string[][];
  documents: (string | null)[][];
  distances: number[][];
  metadatas: (Record<string, unknown> | null)[][];
}

const DEFAULT_HNSW_CONFIG: HNSWIndexConfig = {
  M: 16,
  efConstruction: 200,
  efSearch: 100,
};

export class ChromaVectorStore implements VectorStore {
  private client: ChromaClient | null = null;
  private collection: ChromaCollection | null = null;
  private config: VectorStoreConfig | null = null;
  private hnswConfig: HNSWIndexConfig = DEFAULT_HNSW_CONFIG;

  async initialize(config: VectorStoreConfig, hnswConfig?: HNSWIndexConfig): Promise<void> {
    this.config = config;
    this.hnswConfig = { ...DEFAULT_HNSW_CONFIG, ...hnswConfig };

    try {
      const { ChromaClient } = await import('chromadb');
      const baseUrl = process.env.CHROMA_URL || 'http://localhost:8000';
      this.client = new ChromaClient({ path: baseUrl });

      this.collection = await this.client.getOrCreateCollection({
        name: config.collectionName,
        metadata: {
          'hnsw:space': config.distance || 'cosine',
          'hnsw:M': this.hnswConfig.M,
          'hnsw:ef_construction': this.hnswConfig.efConstruction,
          'hnsw:ef_search': this.hnswConfig.efSearch,
          dimension: config.dimension,
        },
      });
    } catch (error) {
      throw new Error('Failed to initialize ChromaDB: ' + String(error));
    }
  }

  async add(documents: Document[]): Promise<void> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    if (documents.length === 0) return;

    const BATCH_SIZE = 100;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      await this.collection.add({
        ids: batch.map((doc) => doc.id),
        documents: batch.map((doc) => doc.content),
        embeddings: batch.map((doc) => doc.embedding),
        metadatas: batch.map((doc) => doc.metadata || {}),
      });
    }
  }

  async search(query: number[], k: number): Promise<SearchResult[]> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    const startTime = performance.now();
    const results = await this.collection.query({
      queryEmbeddings: [query],
      nResults: k,
    });
    const duration = performance.now() - startTime;

    console.log('ChromaDB search completed in ' + duration.toFixed(2) + 'ms');
    if (duration > 50) {
      console.warn('Search exceeded 50ms threshold: ' + duration.toFixed(2) + 'ms');
    }

    const searchResults: SearchResult[] = [];
    if (results.ids.length > 0) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const score = 1 - results.distances[0][i];
        searchResults.push({
          id: results.ids[0][i],
          content: results.documents[0][i] || '',
          score,
          metadata: results.metadatas[0][i] || undefined,
        });
      }
    }
    return searchResults;
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }
    if (ids.length === 0) return;
    await this.collection.delete({ ids });
  }

  async clear(): Promise<void> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }
    await this.collection.delete({ ids: [] });
  }

  async close(): Promise<void> {
    this.collection = null;
    this.client = null;
  }
}

export function createChromaStore(): ChromaVectorStore {
  return new ChromaVectorStore();
}
