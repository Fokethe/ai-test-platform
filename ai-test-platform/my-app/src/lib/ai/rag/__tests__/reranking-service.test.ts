import { rerankEvidence } from '../reranking-service';

describe('rerankEvidence', () => {
  it('reranks refined candidates and provides rationale', () => {
    const result = rerankEvidence({
      query: 'login timeout',
      topN: 3,
      candidates: [
        {
          id: 'c-1',
          title: 'login timeout handling',
          snippet: 'retry after timeout',
          score: 0.82,
          source: 'vector',
          refinedScore: 0.82,
          reasonSummary: 'overlap high',
        },
        {
          id: 'c-2',
          title: 'account lockout',
          snippet: 'password failed attempts',
          score: 0.79,
          source: 'graph',
          refinedScore: 0.79,
          reasonSummary: 'graph relation',
        },
      ],
    });

    expect(result.model).toBe('cross-encoder-lite');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].rank).toBe(1);
    expect(result.items[0].rationale.length).toBeGreaterThan(0);
    expect(result.items[0].rerankScore).toBeGreaterThanOrEqual(result.items[1].rerankScore);
  });
});
