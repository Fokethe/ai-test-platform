export class DocumentProcessor { 
  async process(content: string, meta: Record<string, any>): Promise<{ id: number; chunks: string[]; totalTokens: number; processedAt: Date }> { 
    return { id: 1, chunks: [], totalTokens: 0, processedAt: new Date() }; 
  } 
}
