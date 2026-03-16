import { HybridRetriever, HybridResult, HybridOptions } from './hybrid-retriever';
import { BM25Search, BM25Document } from './bm25-search';

// Mock vector store for testing
interface MockVectorResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

class MockVectorStore {
  private documents: Map<string, BM25Document> = new Map();

  addDocuments(docs: BM25Document[]) {
    for (const doc of docs) {
      this.documents.set(doc.id, doc);
    }
  }

  async similaritySearch(query: string, topK: number = 10): Promise<MockVectorResult[]> {
    // Simple mock: return documents that contain query words
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: MockVectorResult[] = [];

    for (const [id, doc] of this.documents) {
      const docText = doc.text.toLowerCase();
      let matchCount = 0;
      for (const word of queryWords) {
        if (docText.includes(word)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        results.push({
          id: doc.id,
          text: doc.text,
          score: matchCount / queryWords.length,
          metadata: doc.metadata,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

describe('HybridRetriever', () => {
  let hybridRetriever: HybridRetriever;
  let mockVectorStore: MockVectorStore;
  let bm25Search: BM25Search;
  let documents: BM25Document[];

  beforeEach(() => {
    mockVectorStore = new MockVectorStore();
    bm25Search = new BM25Search({ k1: 1.5, b: 0.75 });

    documents = [
      { id: '1', text: 'React is a JavaScript library for building user interfaces' },
      { id: '2', text: 'TypeScript is a typed superset of JavaScript' },
      { id: '3', text: 'JavaScript is used for web development' },
      { id: '4', text: 'React hooks are functions that let you use state' },
      { id: '5', text: 'Building user interfaces with React is popular' },
      { id: '6', text: 'Python is a programming language for data science' },
      { id: '7', text: 'Machine learning uses Python and algorithms' },
    ];

    mockVectorStore.addDocuments(documents);
    bm25Search.indexDocuments(documents);

    hybridRetriever = new HybridRetriever({
      vectorStore: mockVectorStore as any,
      bm25Search,
      options: {
        vectorWeight: 0.5,
        bm25Weight: 0.5,
        fusionMethod: 'rrf',
        rrfK: 60,
        topK: 5,
      },
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const retriever = new HybridRetriever({
        vectorStore: mockVectorStore as any,
        bm25Search,
      });
      expect(retriever).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const options: HybridOptions = {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        fusionMethod: 'weighted',
        topK: 10,
      };
      const retriever = new HybridRetriever({
        vectorStore: mockVectorStore as any,
        bm25Search,
        options,
      });
      expect(retriever).toBeDefined();
    });
  });

  describe('retrieve', () => {
    it('should return combined results from both retrievers', async () => {
      const results = await hybridRetriever.retrieve('react javascript');
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should include scores in results', async () => {
      const results = await hybridRetriever.retrieve('react');
      expect(results[0].score).toBeDefined();
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should include document metadata', async () => {
      const results = await hybridRetriever.retrieve('react');
      expect(results[0].document).toBeDefined();
      expect(results[0].document.id).toBeDefined();
      expect(results[0].document.text).toBeDefined();
    });

    it('should handle empty query', async () => {
      const results = await hybridRetriever.retrieve('');
      expect(results).toHaveLength(0);
    });

    it('should handle query with no matches', async () => {
      const results = await hybridRetriever.retrieve('xyzabc123');
      expect(results).toHaveLength(0);
    });
  });

  describe('fusion methods', () => {
    it('should use RRF fusion method', async () => {
      const rrfRetriever = new HybridRetriever({
        vectorStore: mockVectorStore as any,
        bm25Search,
        options: {
          fusionMethod: 'rrf',
          rrfK: 60,
          topK: 5,
        },
      });
      const results = await rrfRetriever.retrieve('react');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should use weighted fusion method', async () => {
      const weightedRetriever = new HybridRetriever({
        vectorStore: mockVectorStore as any,
        bm25Search,
        options: {
          fusionMethod: 'weighted',
          vectorWeight: 0.6,
          bm25Weight: 0.4,
          topK: 5,
        },
      });
      const results = await weightedRetriever.retrieve('react');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate results from both retrievers', async () => {
      const results = await hybridRetriever.retrieve('react javascript');
      const ids = results.map(r => r.document.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('ranking', () => {
    it('should rank results by combined score', async () => {
      const results = await hybridRetriever.retrieve('javascript');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('performance', () => {
    it('should complete retrieval within 100ms', async () => {
      const start = performance.now();
      await hybridRetriever.retrieve('react javascript');
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
