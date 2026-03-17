import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export class EmbeddingService {
  private model: string;
  private dimensions: number;

  constructor(model: string = "text-embedding-3-small", dimensions: number = 1536) {
    this.model = model;
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openai.embedding(this.model),
      value: text,
    });
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(batch.map(text => this.generateEmbedding(text)));
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  }

  calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error("向量维度不匹配");
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
