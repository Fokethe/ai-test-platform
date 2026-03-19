import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { loadIndexSource } from '@/lib/ai/rag/index-unit-builder';
import {
  buildMultiRepresentationIndex,
  getRepresentationSnapshot,
} from '@/lib/ai/rag/representation-indexer';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/index-unit-builder', () => ({
  loadIndexSource: jest.fn(),
}));

jest.mock('@/lib/ai/rag/representation-indexer', () => ({
  buildMultiRepresentationIndex: jest.fn(),
  getRepresentationSnapshot: jest.fn(),
}));

describe('/api/knowledge/index-representations route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST returns 401 without auth', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-representations', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('POST returns 404 when source missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-representations', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it('POST returns compensated degraded payload on write failure', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (buildMultiRepresentationIndex as jest.Mock).mockResolvedValue({
      buildId: 'build-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      representationCount: 2,
      summaryCount: 1,
      vectorWriteCount: 0,
      graphWriteCount: 0,
      compensationApplied: true,
      failedStage: 'graph',
      error: 'SIMULATED_GRAPH_WRITE_FAILURE',
      embedding: {
        strategyNameUsed: 'default-hash',
        configuredStrategyName: 'default-hash',
        configVersion: 0,
        dimension: 128,
        fallbackApplied: false,
        source: 'default',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-representations', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('degraded');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_REPRESENTATION_WRITE_COMPENSATED',
      })
    );
  });

  it('POST returns success with fallback audit when embedding strategy falls back', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (buildMultiRepresentationIndex as jest.Mock).mockResolvedValue({
      buildId: 'build-2',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      representationCount: 4,
      summaryCount: 2,
      vectorWriteCount: 4,
      graphWriteCount: 2,
      compensationApplied: false,
      embedding: {
        strategyNameUsed: 'default-hash',
        configuredStrategyName: 'colbert-lite',
        configVersion: 3,
        dimension: 128,
        fallbackApplied: true,
        fallbackReason: 'Strategy unavailable',
        source: 'persisted',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-representations', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('success');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EMBEDDING_STRATEGY_FALLBACK',
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_MULTI_REPRESENTATION_INDEX_BUILT',
      })
    );
  });

  it('GET returns snapshot for accessible source', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-2',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (getRepresentationSnapshot as jest.Mock).mockResolvedValue({
      activeBuild: { id: 'build-2', version: 2, unitCount: 3 },
      vectorEntries: [
        {
          id: 'v-1',
          vectorKey: 'key',
          representationType: 'SUMMARY',
          strategyName: 'default-hash',
          embeddingDim: 128,
          summary: 'sum',
        },
      ],
      graphNodes: [
        {
          id: 'g-1',
          nodeKey: 'node',
          representationType: 'SUMMARY',
          summary: 'sum',
        },
      ],
    });

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/index-representations?sourceType=KNOWLEDGE_ENTRY&sourceId=k-2'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.activeBuild.version).toBe(2);
    expect(payload.data.vectorEntries).toHaveLength(1);
    expect(payload.data.graphNodes).toHaveLength(1);
  });
});
