import { GET } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getEvalQualityCostDashboard,
  recordEvalRefreshGuard,
} from '@/lib/ai/rag/eval-service';

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
  getEvalQualityCostDashboard: jest.fn(),
  recordEvalRefreshGuard: jest.fn(),
}));

describe('/api/knowledge/evals/dashboard route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/dashboard') as never
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when project access denied', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/dashboard?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('returns dashboard metrics and triggers guard when SLA exceeded', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (getEvalQualityCostDashboard as jest.Mock).mockResolvedValue({
      roleScope: 'admin',
      metrics: {
        retrieval: { precision: 0.88, recall: 0.85 },
        generation: { faithfulness: 0.86, groundedness: 0.87 },
        evaluation: { qualityScore: 0.87, runs: 3 },
        cost: { total: 0.2, avgPerRun: 0.0667 },
      },
      trends: [{ date: '2026-03-19', qualityScore: 0.87, totalCost: 0.2, runs: 3 }],
      refresh: {
        latencyMs: 400000,
        slaMs: 300000,
        withinSla: false,
      },
    });
    (recordEvalRefreshGuard as jest.Mock).mockResolvedValue({
      event: {
        id: 'guard-1',
        status: 'DEGRADED',
      },
      fallbackApplied: true,
      recommendation: 'slow_refresh_interval_and_keep_core_metrics',
    });

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/dashboard?projectId=project-1&days=7') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.guard.fallbackApplied).toBe(true);
    expect(recordEvalRefreshGuard).toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EVAL_DASHBOARD_VIEWED',
      })
    );
  });
});
