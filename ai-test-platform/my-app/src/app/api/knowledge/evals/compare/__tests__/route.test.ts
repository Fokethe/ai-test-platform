import { GET } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import { compareStrategyVersions, toComparisonCsv } from '@/lib/ai/rag/eval-service';

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
  compareStrategyVersions: jest.fn(),
  toComparisonCsv: jest.fn(),
}));

describe('/api/knowledge/evals/compare route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when required params are missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await GET(
      new Request('http://localhost/api/knowledge/evals/compare') as never
    );

    expect(response.status).toBe(400);
  });

  it('returns JSON comparison payload', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (compareStrategyVersions as jest.Mock).mockResolvedValue({
      left: { strategyVersion: 1, qualityScore: 0.88, variance: 0.01, avgCost: 0.02, runs: 3 },
      right: { strategyVersion: 2, qualityScore: 0.85, variance: 0.03, avgCost: 0.03, runs: 3 },
      diff: { qualityScore: -0.03, avgCost: 0.01, stability: 0.02 },
      anomalies: {
        qualityDegraded: true,
        costSpike: true,
        stabilityDegraded: true,
      },
      rollbackSuggestion: '建议回滚到策略版本 1',
    });

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/evals/compare?projectId=project-1&datasetVersionId=ds-1&leftStrategyVersion=1&rightStrategyVersion=2'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.comparison.rollbackSuggestion).toContain('回滚');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EVAL_STRATEGY_COMPARISON_VIEWED',
      })
    );
  });

  it('supports CSV export format', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (compareStrategyVersions as jest.Mock).mockResolvedValue({
      left: {},
      right: {},
      diff: {},
      anomalies: {},
      rollbackSuggestion: 'ok',
    });
    (toComparisonCsv as jest.Mock).mockReturnValue('dimension,left,right,diff');

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/evals/compare?datasetVersionId=ds-1&leftStrategyVersion=1&rightStrategyVersion=2&format=csv'
      ) as never
    );
    const text = await response.text();
    const contentType =
      response.headers.get('content-type') || response.headers.get('Content-Type');

    expect(response.status).toBe(200);
    expect(contentType).toContain('text/csv');
    expect(text).toContain('dimension');
  });
});
