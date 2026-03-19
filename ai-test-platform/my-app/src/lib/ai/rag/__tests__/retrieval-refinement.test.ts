import { refineRetrievalEvidence } from '../retrieval-refinement';

describe('refineRetrievalEvidence', () => {
  it('dedupes candidates and returns explainability with refined scores', () => {
    const result = refineRetrievalEvidence({
      query: 'login timeout',
      topK: 5,
      candidates: [
        {
          id: 'a-1',
          title: 'login timeout handling',
          snippet: 'timeout retry flow',
          score: 0.74,
          source: 'vector',
        },
        {
          id: 'a-1',
          title: 'login timeout handling duplicate',
          snippet: 'older duplicate',
          score: 0.61,
          source: 'relational',
        },
        {
          id: 'a-2',
          title: 'password validation',
          snippet: 'password format',
          score: 0.6,
          source: 'graph',
        },
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.explainability).toHaveLength(2);
    expect(result.items[0].id).toBe('a-1');
    expect(result.items[0].refinedScore).toBeGreaterThan(0.7);
    expect(result.explainability[0].evidenceId).toBe('a-1');
  });
});
