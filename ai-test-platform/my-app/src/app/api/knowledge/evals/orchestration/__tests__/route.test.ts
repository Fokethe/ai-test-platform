import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { listEvalRuns, runEvalOrchestration } from '@/lib/ai/rag/eval-service';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/eval-service', () => ({
  listEvalRuns: jest.fn(),
  runEvalOrchestration: jest.fn(),
}));

describe('/api/knowledge/evals/orchestration route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/orchestration') as never
    );

    expect(response.status).toBe(401);
  });

  it('GET returns run list', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (listEvalRuns as jest.Mock).mockResolvedValue([
      {
        id: 'run-1',
        status: 'COMPLETED',
        strategyVersion: 3,
        resultVersion: 1,
        totalCost: 0.01,
        retryCount: 0,
        reproducibilityKey: 'rk-1',
        createdAt: new Date('2026-03-19T10:00:00.000Z'),
        finishedAt: new Date('2026-03-19T10:00:02.000Z'),
        datasetVersion: {
          id: 'ds-1',
          name: 'regression',
          datasetVersion: 'v1',
          itemCount: 12,
        },
        parsedMetrics: {
          evaluation: {
            qualityScore: 0.88,
          },
        },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/orchestration?projectId=project-1') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.runs).toHaveLength(1);
  });

  it('POST returns 403 when project access denied', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/orchestration', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          strategyVersion: 2,
          dataset: {
            name: 'testset',
            version: 'v1',
            items: [{ question: 'q', answer: 'a' }],
          },
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('POST runs orchestration and writes audit', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (runEvalOrchestration as jest.Mock).mockResolvedValue({
      datasetVersion: {
        id: 'ds-1',
        name: 'eval-set',
        datasetVersion: '2026-03-19',
        itemCount: 5,
        checksum: 'ck-1',
      },
      frameworks: ['ragas', 'grouse', 'deepeval'],
      reproducibilityKey: 'rk-1',
      runs: [
        {
          id: 'run-1',
          status: 'COMPLETED',
          strategyVersion: 2,
          resultVersion: 1,
          totalCost: 0.013,
          createdAt: new Date('2026-03-19T10:00:00.000Z'),
          finishedAt: new Date('2026-03-19T10:00:02.000Z'),
          parsedMetrics: {
            evaluation: {
              qualityScore: 0.89,
            },
          },
        },
      ],
      stability: {
        sampleSize: 3,
        variance: 0.01,
        threshold: 0.02,
        satisfied: true,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/orchestration', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          strategyVersion: 2,
          runCount: 1,
          dataset: {
            name: 'eval-set',
            version: '2026-03-19',
            items: [{ question: 'what', answer: 'ok', groundTruth: 'ok' }],
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.nfr12.satisfied).toBe(true);
    expect(runEvalOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        strategyVersion: 2,
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EVAL_ORCHESTRATION_COMPLETED',
      })
    );
  });
});
