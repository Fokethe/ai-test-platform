import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { retryEvalRun } from '@/lib/ai/rag/eval-service';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ragEvalRun: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/eval-service', () => ({
  retryEvalRun: jest.fn(),
}));

describe('/api/knowledge/evals/runs/[id]/retry route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when run is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.ragEvalRun.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/runs/run-1/retry', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 when run status is not FAILED', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.ragEvalRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      status: 'COMPLETED',
      projectId: 'project-1',
      strategyVersion: 2,
      datasetVersionId: 'ds-1',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/runs/run-1/retry', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );

    expect(response.status).toBe(400);
  });

  it('retries failed run successfully', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.ragEvalRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      status: 'FAILED',
      projectId: 'project-1',
      strategyVersion: 2,
      datasetVersionId: 'ds-1',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (retryEvalRun as jest.Mock).mockResolvedValue({
      run: {
        id: 'run-2',
        status: 'COMPLETED',
        strategyVersion: 2,
        resultVersion: 3,
        retryCount: 1,
        totalCost: 0.013,
        reproducibilityKey: 'rk-1',
        createdAt: new Date('2026-03-19T12:00:00.000Z'),
        finishedAt: new Date('2026-03-19T12:00:02.000Z'),
        parsedMetrics: {
          evaluation: {
            qualityScore: 0.9,
          },
        },
      },
      stability: {
        sampleSize: 3,
        variance: 0.01,
        threshold: 0.02,
        satisfied: true,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/runs/run-1/retry', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'run-1' }) } as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.nfr12.satisfied).toBe(true);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EVAL_RUN_RETRIED',
      })
    );
  });
});
