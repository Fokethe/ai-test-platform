// encoding: utf-8
import { ChromaClient, Collection } from "chromadb";

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: object;
  projectId: string;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: object;
  distance: number;
  projectId: string;
}

export class ChromaService {
  private client: ChromaClient;
  private collectionCache: Map<string, Collection> = new Map();

  constructor(url?: string) {
    this.client = new ChromaClient({
      path: url || process.env.CHROMA_URL || "http://localhost:8000",
    });
  }

  async createCollection(name: string, metadata?: object): Promise<Collection> {
    const collection = await this.client.createCollection({ name, metadata: metadata as Record<string, unknown> });
    this.collectionCache.set(name, collection);
    return collection;
  }

  async getCollection(name: string): Promise<Collection> {
    if (this.collectionCache.has(name)) return this.collectionCache.get(name)!;
    const collection = await this.client.getCollection({ name });
    this.collectionCache.set(name, collection);
    return collection;
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection({ name });
    this.collectionCache.delete(name);
  }

  async listCollections(): Promise<string[]> {
    const collections = await this.client.listCollections();
    return collections.map((c: { name: string }) => c.name);
  }

  async addDocument(collectionName: string, document: VectorDocument): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.add({
      ids: [document.id],
      documents: [document.content],
      embeddings: [document.embedding],
      metadatas: [document.metadata as Record<string, unknown>],
    });
  }

  async addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.add({
      ids: documents.map(d => d.id),
      documents: documents.map(d => d.content),
      embeddings: documents.map(d => d.embedding),
      metadatas: documents.map(d => d.metadata as Record<string, unknown>),
    });
  }

  async search(
    collectionName: string,
    queryEmbedding: number[],
    nResults: number = 10,
    where?: object
  ): Promise<SearchResult[]> {
    const collection = await this.getCollection(collectionName);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      where: where as Record<string, unknown>,
    });

    if (!results.ids || results.ids.length === 0) {
      return [];
    }

    const ids = results.ids[0] as string[];
    const documents = (results.documents?.[0] as string[]) || [];
    const metadatas = (results.metadatas?.[0] as object[]) || [];
    const distances = (results.distances?.[0] as number[]) || [];

    return ids.map((id, index) => ({
      id,
      content: documents[index] || "",
      metadata: metadatas[index] || {},
      distance: distances[index] || 0,
      projectId: (metadatas[index] as { projectId?: string })?.projectId || "",
    }));
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.delete({ ids: [documentId] });
  }
}

export const chromaService = new ChromaService();
