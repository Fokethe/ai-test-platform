import {
  buildGenerationQuery,
  parseGenerationSelection,
  resolveModelId,
} from '../TestCasesContent';

function createSearchParams(values: Record<string, string | null>) {
  return {
    get(key: string) {
      return values[key] ?? null;
    },
  } as Pick<ReadonlyURLSearchParams, 'get'>;
}

describe('testcase generation query helpers', () => {
  it('keeps supported model ids', () => {
    expect(resolveModelId('gpt-5.4')).toBe('gpt-5.4');
    expect(resolveModelId('kimi-k2.5')).toBe('kimi-k2.5');
  });

  it('falls back to the default model when the id is missing or invalid', () => {
    expect(resolveModelId(null)).toBe('gpt-5.3');
    expect(resolveModelId('invalid-model')).toBe('gpt-5.3');
  });

  it('parses multiple test point ids and keeps the legacy single id for compatibility', () => {
    const selection = parseGenerationSelection(
      createSearchParams({
        requirementId: 'req-001',
        testPointIds: 'tp-001,tp-002,tp-001',
        testPointId: 'tp-003',
        modelId: 'gpt-5.4',
      })
    );

    expect(selection).toEqual({
      requirementId: 'req-001',
      testPointIds: ['tp-001', 'tp-002', 'tp-003'],
      modelId: 'gpt-5.4',
    });
  });

  it('builds a backward compatible query string for the generation workspace', () => {
    const query = buildGenerationQuery({
      requirementId: 'req-001',
      testPointIds: ['tp-001', 'tp-002'],
      modelId: 'kimi-k2.5',
    });

    expect(query.get('requirementId')).toBe('req-001');
    expect(query.get('testPointIds')).toBe('tp-001,tp-002');
    expect(query.get('testPointId')).toBe('tp-001');
    expect(query.get('modelId')).toBe('kimi-k2.5');
  });
});
