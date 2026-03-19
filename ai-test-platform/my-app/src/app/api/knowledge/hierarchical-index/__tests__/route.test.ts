import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { loadIndexSource } from '@/lib/ai/rag/index-unit-builder';
import {
  getHierarchicalIndexSnapshot,
  layeredRecallFromNodes,
  runHierarchicalIndexJob,
} from '@/lib/ai/rag/hierarchical-indexer';

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

jest.mock('@/lib/ai/rag/hierarchical-indexer', () => ({
  runHierarchicalIndexJob: jest.fn(),
  getHierarchicalIndexSnapshot: jest.fn(),
  layeredRecallFromNodes: jest.fn(),
}));

describe('/api/knowledge/hierarchical-index route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/hierarchical-index', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('POST returns 404 when source not found', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/hierarchical-index', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it('POST returns failed payload when interrupted and writes failure audit', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (runHierarchicalIndexJob as jest.Mock).mockResolvedValue({
      jobId: 'job-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      status: 'FAILED',
      stage: 'cluster-sub',
      nodeCount: 0,
      checkpointCount: 1,
      recoveryWindowMinutes: 10,
      error: 'SIMULATED_INTERRUPT_CLUSTER_SUB',
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/hierarchical-index', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
          simulateInterruptStage: 'cluster-sub',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('failed');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_HIERARCHICAL_INDEX_FAILED',
      })
    );
  });

  it('POST completes resumed job and exposes recovery SLA result', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-2',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (runHierarchicalIndexJob as jest.Mock).mockResolvedValue({
      jobId: 'job-2',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-2',
      status: 'COMPLETED',
      stage: 'completed',
      nodeCount: 12,
      checkpointCount: 3,
      recoveredFromJobId: 'job-1',
      recoveredWithinSla: true,
      recoveryWindowMinutes: 10,
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/hierarchical-index', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resume',
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-2',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('completed');
    expect(payload.data.recoveredWithinSla).toBe(true);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_HIERARCHICAL_INDEX_COMPLETED',
      })
    );
  });

  it('GET returns layered index snapshot', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-3',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (getHierarchicalIndexSnapshot as jest.Mock).mockResolvedValue({
      latestJob: {
        id: 'job-3',
        status: 'COMPLETED',
        stage: 'completed',
        recoveredFromJobId: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        lastError: null,
      },
      checkpoints: [{ id: 'cp-1' }, { id: 'cp-2' }],
      nodes: [
        {
          id: 'n-1',
          parentId: null,
          level: 0,
          nodeKey: 'root',
          clusterKey: 'root-1',
          summary: 'root summary',
          unitRefsJson: JSON.stringify(['u1', 'u2']),
        },
        {
          id: 'n-2',
          parentId: 'n-1',
          level: 1,
          nodeKey: 'sub',
          clusterKey: 'root-1-sub-1',
          summary: 'sub summary',
          unitRefsJson: JSON.stringify(['u1']),
        },
      ],
    });

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/hierarchical-index?sourceType=KNOWLEDGE_ENTRY&sourceId=k-3'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.nodeCount).toBe(2);
    expect(payload.data.levels.L0).toBe(1);
    expect(payload.data.levels.L1).toBe(1);
  });

  it('GET returns layered recall candidates when recallQuery provided', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-3',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (getHierarchicalIndexSnapshot as jest.Mock).mockResolvedValue({
      latestJob: null,
      checkpoints: [],
      nodes: [
        {
          id: 'n-1',
          parentId: null,
          level: 0,
          nodeKey: 'root',
          clusterKey: 'root-1',
          summary: 'login summary',
          unitRefsJson: JSON.stringify(['u1']),
        },
      ],
    });
    (layeredRecallFromNodes as jest.Mock).mockReturnValue([
      { id: 'n-1', level: 0, score: 0.8, summary: 'login summary', unitRefs: ['u1'] },
    ]);

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/hierarchical-index?sourceType=KNOWLEDGE_ENTRY&sourceId=k-3&recallQuery=login'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.layeredRecall).toHaveLength(1);
    expect(layeredRecallFromNodes).toHaveBeenCalled();
  });
});
