import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { listRefreshGuardEvents, recordEvalRefreshGuard } from '@/lib/ai/rag/eval-service';

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
  listRefreshGuardEvents: jest.fn(),
  recordEvalRefreshGuard: jest.fn(),
}));

describe('/api/knowledge/evals/refresh-guard route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns guard events', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (listRefreshGuardEvents as jest.Mock).mockResolvedValue([
      {
        id: 'guard-1',
        guardType: 'DASHBOARD_REFRESH',
        status: 'DEGRADED',
        observedLatencyMs: 450000,
        thresholdMs: 300000,
        details: { reason: 'delay' },
        createdAt: new Date('2026-03-19T12:00:00.000Z'),
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/refresh-guard?projectId=project-1') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.events).toHaveLength(1);
  });

  it('POST triggers fallback and writes audit when degraded', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (recordEvalRefreshGuard as jest.Mock).mockResolvedValue({
      event: {
        id: 'guard-2',
        guardType: 'DASHBOARD_REFRESH',
        status: 'DEGRADED',
        observedLatencyMs: 420000,
        thresholdMs: 300000,
        createdAt: new Date('2026-03-19T12:10:00.000Z'),
      },
      fallbackApplied: true,
      recommendation: 'slow_refresh_interval_and_keep_core_metrics',
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/evals/refresh-guard', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          observedLatencyMs: 420000,
          thresholdMs: 300000,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.fallbackApplied).toBe(true);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EVAL_REFRESH_GUARD_TRIGGERED',
      })
    );
  });
});
