import { BM25Search, BM25Document } from './bm25-search';

describe('BM25Search', () => {
  let bm25: BM25Search;
  let documents: BM25Document[];

  beforeEach(() => {
    bm25 = new BM25Search({ k1: 1.5, b: 0.75 });
    documents = [
      { id: '1', text: 'React is a JavaScript library for building user interfaces' },
      { id: '2', text: 'TypeScript is a typed superset of JavaScript' },
      { id: '3', text: 'JavaScript is used for web development' },
      { id: '4', text: 'React hooks are functions that let you use state' },
      { id: '5', text: 'Building user interfaces with React is popular' },
    ];
    bm25.indexDocuments(documents);
  });

  describe('indexDocuments', () => {
    it('should build inverted index correctly', () => {
      const stats = bm25.getStats();
      expect(stats.documentCount).toBe(5);
      expect(stats.avgDocumentLength).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should return relevant documents for query', () => {
      const results = bm25.search('react javascript', 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should rank documents with more query terms higher', () => {
      const results = bm25.search('react javascript', 5);
      const topResult = results[0];
      expect(topResult.document.text.toLowerCase()).toContain('react');
    });

    it('should return empty array for no matches', () => {
      const results = bm25.search('python machine learning', 5);
      expect(results.length).toBe(0);
    });

    it('should limit results to topK', () => {
      const results = bm25.search('javascript', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('tokenization', () => {
    it('should tokenize text correctly', () => {
      const tokens = bm25.tokenize('Hello World! React.js');
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
      expect(tokens).toContain('react');
    });

    it('should handle empty strings', () => {
      const tokens = bm25.tokenize('');
      expect(tokens).toHaveLength(0);
    });
  });

  describe('BM25 scoring', () => {
    it('should calculate IDF correctly', () => {
      const idf = bm25.calculateIDF('react');
      expect(idf).toBeGreaterThan(0);
    });

    it('should handle rare terms with higher IDF', () => {
      const commonIDF = bm25.calculateIDF('javascript');
      const rareIDF = bm25.calculateIDF('hooks');
      expect(rareIDF).toBeGreaterThanOrEqual(commonIDF);
    });
  });

  describe('performance', () => {
    it('should search within 100ms for small dataset', async () => {
      const start = performance.now();
      bm25.search('react javascript', 5);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
