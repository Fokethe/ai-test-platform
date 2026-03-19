import { computeVariance, toComparisonCsv } from '../eval-service';

describe('eval-service helpers', () => {
  it('computeVariance returns stable value', () => {
    const variance = computeVariance([0.8, 0.82, 0.81]);
    expect(variance).toBeCloseTo(0.000067, 6);
  });

  it('toComparisonCsv returns exportable csv content', () => {
    const csv = toComparisonCsv({
      left: {
        strategyVersion: 1,
        runs: 3,
        qualityScore: 0.88,
        variance: 0.01,
        avgCost: 0.02,
      },
      right: {
        strategyVersion: 2,
        runs: 3,
        qualityScore: 0.86,
        variance: 0.03,
        avgCost: 0.03,
      },
      diff: {
        qualityScore: -0.02,
        avgCost: 0.01,
        stability: 0.02,
      },
      anomalies: {
        qualityDegraded: true,
        costSpike: true,
        stabilityDegraded: true,
      },
      rollbackSuggestion: '建议回滚到策略版本 1',
    });

    expect(csv).toContain('dimension,left_strategy,right_strategy,diff');
    expect(csv).toContain('rollback_suggestion');
  });
});
