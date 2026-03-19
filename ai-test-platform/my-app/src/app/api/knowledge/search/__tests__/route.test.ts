import { POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getRAGService } from '@/lib/ai/rag/rag-service';
import { executeMultiSourceQuery } from '@/lib/ai/rag/multi-source-query';
import {
  evaluateRoutingRules,
  getLatestRoutingRuleSet,
} from '@/lib/ai/rag/logic-routing';
import {
  getActivePromptTemplates,
  selectPromptTemplate,
} from '@/lib/ai/rag/semantic-routing';
import { resolveRagStrategyConfig } from '@/lib/ai/rag/strategy-config';
import { writeAuditLog } from '@/lib/audit';
import { refineRetrievalEvidence } from '@/lib/ai/rag/retrieval-refinement';
import { rerankEvidence } from '@/lib/ai/rag/reranking-service';
import { runControlledGeneration } from '@/lib/ai/rag/controlled-generation';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/rag/rag-service', () => ({
  getRAGService: jest.fn(),
}));

jest.mock('@/lib/ai/rag/multi-source-query', () => ({
  executeMultiSourceQuery: jest.fn(),
}));

jest.mock('@/lib/ai/rag/logic-routing', () => ({
  DEFAULT_ROUTING_SOURCES: ['relational', 'graph', 'vector'],
  getLatestRoutingRuleSet: jest.fn(),
  parseRoutingRules: jest.fn((rules) => rules),
  evaluateRoutingRules: jest.fn(),
}));

jest.mock('@/lib/ai/rag/semantic-routing', () => ({
  getActivePromptTemplates: jest.fn(),
  selectPromptTemplate: jest.fn(),
}));

jest.mock('@/lib/ai/rag/strategy-config', () => ({
  resolveRagStrategyConfig: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/retrieval-refinement', () => ({
  refineRetrievalEvidence: jest.fn(),
}));

jest.mock('@/lib/ai/rag/reranking-service', () => ({
  rerankEvidence: jest.fn(),
}));

jest.mock('@/lib/ai/rag/controlled-generation', () => ({
  runControlledGeneration: jest.fn(),
}));

describe('POST /api/knowledge/search', () => {
  const ragServiceMock = {
    initialize: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getRAGService as jest.Mock).mockReturnValue(ragServiceMock);
    ragServiceMock.initialize.mockResolvedValue(undefined);
    ragServiceMock.query.mockResolvedValue({
      answer: 'answer text',
      sources: [
        {
          id: 'source-1',
          content: 'source content',
          score: 0.88,
          metadata: { type: 'knowledge' },
        },
      ],
      citations: ['citation-1'],
      context: {
        query: 'login',
        rewrittenQuery: 'login rewritten',
        retrievalTime: 25,
        cacheHit: false,
      },
      selfRAGResult: undefined,
    });
    (prisma.project.findMany as jest.Mock).mockResolvedValue([{ id: 'project-1' }]);
    (resolveRagStrategyConfig as jest.Mock).mockResolvedValue({
      id: 'cfg-1',
      version: 2,
      source: 'persisted',
      toggles: {
        multiQuery: false,
        hyde: true,
        decomposition: false,
        fusion: false,
      },
    });
    (getLatestRoutingRuleSet as jest.Mock).mockResolvedValue(null);
    (evaluateRoutingRules as jest.Mock).mockReturnValue({
      selectedSources: ['relational', 'graph', 'vector'],
      reason: 'No routing rule matched. Use default source path.',
    });
    (getActivePromptTemplates as jest.Mock).mockResolvedValue([]);
    (selectPromptTemplate as jest.Mock).mockReturnValue({
      scenario: 'default',
      name: 'system-default',
      version: 0,
      confidence: 0,
      reason: 'No active template found. Fallback to default prompt.',
      appliedPrompt: 'Answer the question carefully.\nlogin',
    });
    (refineRetrievalEvidence as jest.Mock).mockReturnValue({
      items: [
        {
          id: 'source-1',
          title: 'rag-source-1',
          snippet: 'source content',
          source: 'vector',
          score: 0.91,
          refinedScore: 0.91,
          reasonSummary: 'baseline',
        },
      ],
      explainability: [
        {
          evidenceId: 'source-1',
          source: 'vector',
          baseScore: 0.88,
          overlapScore: 0.9,
          sourceReliability: 0.94,
          freshnessBoost: 0,
          finalScore: 0.91,
          overlapTokens: ['login'],
        },
      ],
      coverage: 0.9,
    });
    (rerankEvidence as jest.Mock).mockReturnValue({
      model: 'cross-encoder-lite',
      items: [
        {
          id: 'source-1',
          title: 'rag-source-1',
          snippet: 'source content',
          source: 'vector',
          score: 0.93,
          refinedScore: 0.91,
          rerankScore: 0.93,
          rank: 1,
          reasonSummary: 'baseline',
          rationale: ['lexical=1.00'],
        },
      ],
    });
    (runControlledGeneration as jest.Mock).mockResolvedValue({
      mode: 'standard',
      answer: 'controlled answer',
      citations: [
        {
          id: 'source-1',
          label: '[1]',
          source: 'vector',
          excerpt: 'source content',
          score: 0.93,
        },
      ],
      iterations: 1,
      confidence: 0.9,
      activeRetrievalTriggered: false,
      trace: [
        {
          iteration: 1,
          phase: 'reflect',
          note: 'initial_coverage=0.90',
          confidence: 0.9,
        },
      ],
      usedEvidence: [
        {
          id: 'source-1',
          source: 'vector',
          rerankScore: 0.93,
        },
      ],
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when explicit project is not accessible', async () => {
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          projectId: 'project-1',
        }),
      }) as never
    );

    expect(response.status).toBe(403);
    expect(hasProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('returns rag response when multi-source is disabled', async () => {
    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            topK: 6,
            enableMultiSource: false,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.answer).toBe('answer text');
    expect(payload.data.strategy.version).toBe(2);
    expect(payload.data.strategy.toggles.multiQuery).toBe(false);
    expect(payload.data.routing.ruleSetVersion).toBe(0);
    expect(payload.data.routing.matchedRule).toBeUndefined();
    expect(payload.data.semanticRouting.scenario).toBe('default');
    expect(payload.data.semanticRouting.confidence).toBe(0);
    expect(payload.data.multiSource).toBeUndefined();
    expect(executeMultiSourceQuery).not.toHaveBeenCalled();
  });

  it('runs multi-source flow and keeps response successful when one source fails', async () => {
    (executeMultiSourceQuery as jest.Mock).mockResolvedValue({
      plans: [
        {
          source: 'relational',
          statement: 'SQL',
          params: { query: 'login', projectIds: ['project-1'] },
        },
      ],
      sourceResults: [
        {
          source: 'relational',
          success: true,
          plan: { source: 'relational', statement: 'SQL', params: {} },
          items: [],
          latencyMs: 8,
        },
        {
          source: 'graph',
          success: false,
          plan: { source: 'graph', statement: 'Cypher', params: {} },
          items: [],
          error: 'GRAPH_TIMEOUT',
          latencyMs: 9,
        },
      ],
      mergedCandidates: [],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            enableMultiSource: true,
            topK: 5,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.multiSource.failedSources).toEqual([
      { source: 'graph', error: 'GRAPH_TIMEOUT' },
    ]);
    expect(executeMultiSourceQuery).toHaveBeenCalledWith({
      query: 'login',
      projectIds: ['project-1'],
      topK: 5,
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        action: 'MULTI_SOURCE_QUERY_PARTIAL_FAILURE',
      })
    );
  });

  it('uses persisted multi-query toggle and returns strategy metadata', async () => {
    (resolveRagStrategyConfig as jest.Mock).mockResolvedValue({
      id: 'cfg-2',
      version: 5,
      source: 'persisted',
      toggles: {
        multiQuery: true,
        hyde: true,
        decomposition: false,
        fusion: false,
      },
    });
    (executeMultiSourceQuery as jest.Mock).mockResolvedValue({
      plans: [],
      sourceResults: [],
      mergedCandidates: [],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            topK: 4,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.strategy.version).toBe(5);
    expect(payload.data.strategy.source).toBe('persisted');
    expect(payload.data.strategy.toggles.multiQuery).toBe(true);
    expect(executeMultiSourceQuery).toHaveBeenCalledTimes(3);
    expect(executeMultiSourceQuery).toHaveBeenCalledWith({
      query: 'login edge case',
      projectIds: ['project-1'],
      topK: 4,
    });
  });

  it('applies matched routing rule and filters selected sources', async () => {
    (getLatestRoutingRuleSet as jest.Mock).mockResolvedValue({
      id: 'rr-1',
      version: 3,
      rulesJson: '[]',
    });
    (evaluateRoutingRules as jest.Mock).mockReturnValue({
      selectedSources: ['graph'],
      matchedRule: {
        id: 'rule-graph',
        name: 'Graph rule',
        priority: 100,
        targetSources: ['graph'],
      },
      reason: 'Matched rule "Graph rule" (priority: 100)',
    });
    (executeMultiSourceQuery as jest.Mock).mockResolvedValue({
      plans: [
        { source: 'relational', statement: 'SQL', params: {} },
        { source: 'graph', statement: 'Cypher', params: {} },
      ],
      sourceResults: [
        {
          source: 'relational',
          success: true,
          plan: { source: 'relational', statement: 'SQL', params: {} },
          items: [
            {
              id: 'rel-1',
              title: 'rel',
              snippet: 'rel',
              score: 0.7,
              source: 'relational',
            },
          ],
          latencyMs: 8,
        },
        {
          source: 'graph',
          success: true,
          plan: { source: 'graph', statement: 'Cypher', params: {} },
          items: [
            {
              id: 'graph-1',
              title: 'graph',
              snippet: 'graph',
              score: 0.9,
              source: 'graph',
            },
          ],
          latencyMs: 10,
        },
      ],
      mergedCandidates: [
        {
          id: 'rel-1',
          title: 'rel',
          snippet: 'rel',
          score: 0.7,
          source: 'relational',
        },
        {
          id: 'graph-1',
          title: 'graph',
          snippet: 'graph',
          score: 0.9,
          source: 'graph',
        },
      ],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'graph relation query',
          departmentId: 'dept-1',
          options: {
            topK: 5,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.routing.ruleSetVersion).toBe(3);
    expect(payload.data.routing.matchedRule.id).toBe('rule-graph');
    expect(payload.data.multiSource.sourceResults).toHaveLength(1);
    expect(payload.data.multiSource.sourceResults[0].source).toBe('graph');
    expect(payload.data.multiSource.mergedCandidates).toHaveLength(1);
    expect(payload.data.multiSource.mergedCandidates[0].source).toBe('graph');
  });

  it('returns semantic routing confidence and template metadata', async () => {
    (getActivePromptTemplates as jest.Mock).mockResolvedValue([
      {
        id: 'tpl-1',
        scenario: 'bug-analysis',
        name: 'Bug Template',
        version: 3,
        template: 'Analyze bug: {{query}}',
        keywords: ['bug', 'error'],
      },
    ]);
    (selectPromptTemplate as jest.Mock).mockReturnValue({
      templateId: 'tpl-1',
      scenario: 'bug-analysis',
      name: 'Bug Template',
      version: 3,
      confidence: 0.83,
      reason: 'Selected by semantic overlap (keywords=0.75, scenario=1.00)',
      appliedPrompt: 'Analyze bug: login error',
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login error',
          departmentId: 'dept-1',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.semanticRouting.scenario).toBe('bug-analysis');
    expect(payload.data.semanticRouting.version).toBe(3);
    expect(payload.data.semanticRouting.confidence).toBe(0.83);
    expect(payload.data.semanticRouting.reason).toContain('semantic overlap');
  });

  it('returns refinement, reranking and controlled-generation payload when Epic 5 options enabled', async () => {
    (runControlledGeneration as jest.Mock).mockResolvedValueOnce({
      mode: 'rrr',
      answer: 'epic5 controlled answer',
      citations: [
        {
          id: 'source-1',
          label: '[1]',
          source: 'vector',
          excerpt: 'source content',
          score: 0.93,
        },
      ],
      iterations: 2,
      confidence: 0.87,
      activeRetrievalTriggered: false,
      trace: [
        {
          iteration: 1,
          phase: 'reflect',
          note: 'initial_coverage=0.80',
          confidence: 0.8,
        },
        {
          iteration: 2,
          phase: 'revise',
          note: 'retrieve_read_refine',
          confidence: 0.87,
        },
      ],
      usedEvidence: [
        {
          id: 'source-1',
          source: 'vector',
          rerankScore: 0.93,
        },
      ],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            enableRefinement: true,
            enableReranking: true,
            generationMode: 'rrr',
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.answer).toBe('epic5 controlled answer');
    expect(payload.data.retrievalRefinement.enabled).toBe(true);
    expect(payload.data.reranking.enabled).toBe(true);
    expect(payload.data.generationControl.mode).toBe('rrr');
    expect(runControlledGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'rrr',
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_CONTROLLED_GENERATION_COMPLETED',
      })
    );
  });

  it('logs active-retrieval audit event when controlled generation triggers extra retrieval', async () => {
    (runControlledGeneration as jest.Mock).mockResolvedValueOnce({
      mode: 'self-rag',
      answer: 'self-rag answer',
      citations: [
        {
          id: 'source-1',
          label: '[1]',
          source: 'vector',
          excerpt: 'source content',
          score: 0.88,
        },
      ],
      iterations: 2,
      confidence: 0.82,
      activeRetrievalTriggered: true,
      trace: [
        {
          iteration: 1,
          phase: 'reflect',
          note: 'initial_coverage=0.50',
          confidence: 0.5,
        },
        {
          iteration: 2,
          phase: 'retrieve',
          note: 'followup_retrieval',
          query: 'login details',
          addedEvidenceCount: 1,
          confidence: 0.82,
        },
      ],
      usedEvidence: [
        {
          id: 'source-1',
          source: 'vector',
          rerankScore: 0.88,
        },
      ],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            enableRefinement: true,
            enableReranking: true,
            enableActiveRetrieval: true,
            enableMultiSource: false,
            generationMode: 'self-rag',
          },
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(runControlledGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        activeRetrieval: true,
        retrieveMore: expect.any(Function),
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_ACTIVE_RETRIEVAL_TRIGGERED',
      })
    );
  });

  it('passes retrieveMore callback when active retrieval is enabled even if multi-source is disabled', async () => {
    (runControlledGeneration as jest.Mock).mockResolvedValueOnce({
      mode: 'self-rag',
      answer: 'self-rag answer',
      citations: [],
      iterations: 1,
      confidence: 0.7,
      activeRetrievalTriggered: false,
      trace: [],
      usedEvidence: [],
    });
    (executeMultiSourceQuery as jest.Mock).mockResolvedValue({
      plans: [],
      sourceResults: [],
      mergedCandidates: [],
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'login',
          departmentId: 'dept-1',
          options: {
            enableActiveRetrieval: true,
            enableMultiSource: false,
            generationMode: 'self-rag',
          },
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(runControlledGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        activeRetrieval: true,
        retrieveMore: expect.any(Function),
      })
    );

    const generationInput = (runControlledGeneration as jest.Mock).mock.calls[0]?.[0] as {
      retrieveMore?: (followupQuery: string) => Promise<unknown[]>;
    };
    await generationInput.retrieveMore?.('followup query');

    expect(executeMultiSourceQuery).toHaveBeenCalledWith({
      query: 'followup query',
      projectIds: ['project-1'],
      topK: 10,
    });
  });
});
