import { runControlledGeneration } from '../controlled-generation';

const baseEvidence = [
  {
    id: 'e-1',
    title: 'login timeout handling',
    snippet: 'timeout and retry policy',
    score: 0.9,
    source: 'vector' as const,
    refinedScore: 0.9,
    rerankScore: 0.9,
    rank: 1,
    reasonSummary: 'high overlap',
    rationale: ['lexical=0.9'],
  },
];

describe('runControlledGeneration', () => {
  it('returns standard generation output with citations', async () => {
    const result = await runControlledGeneration({
      query: 'login timeout',
      mode: 'standard',
      evidence: baseEvidence,
    });

    expect(result.mode).toBe('standard');
    expect(result.citations).toHaveLength(1);
    expect(result.answer).toContain('login timeout');
    expect(result.activeRetrievalTriggered).toBe(false);
  });

  it('triggers active retrieval in self-rag mode when coverage is low', async () => {
    const result = await runControlledGeneration({
      query: 'payment timeout rollback',
      mode: 'self-rag',
      evidence: [
        {
          ...baseEvidence[0],
          title: 'login timeout handling',
          snippet: 'login timeout retries only',
        },
      ],
      activeRetrieval: true,
      retrieveMore: async () => [
        {
          id: 'e-2',
          title: 'payment rollback strategy',
          snippet: 'rollback transaction after timeout',
          score: 0.88,
          source: 'graph',
        },
      ],
    });

    expect(result.mode).toBe('self-rag');
    expect(result.activeRetrievalTriggered).toBe(true);
    expect(result.iterations).toBeGreaterThan(1);
    expect(result.trace.some((step) => step.phase === 'retrieve')).toBe(true);
  });
});
