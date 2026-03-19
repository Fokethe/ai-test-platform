import { DocumentProcessor } from '@/lib/ai/rag/document-processor';

describe('DocumentProcessor semantic splitting', () => {
  it('splits mixed language text into semantic chunks with offsets', async () => {
    const processor = new DocumentProcessor();
    const result = await processor.process(
      '登录成功后显示仪表盘。支持记住我功能。When token expires, user should relogin. Error state should be visible.',
      {
        targetChunkSize: 40,
        minChunkSize: 20,
      }
    );

    expect(result.units.length).toBeGreaterThan(1);
    expect(result.qualityScore).toBeGreaterThan(0);
    expect(result.units[0].startOffset).toBeGreaterThanOrEqual(0);
    expect(result.units[0].endOffset).toBeGreaterThan(result.units[0].startOffset);
  });

  it('respects maxChunks option', async () => {
    const processor = new DocumentProcessor();
    const result = await processor.process(
      'A. B. C. D. E. F. G. H. I. J.',
      {
        targetChunkSize: 5,
        minChunkSize: 3,
        maxChunks: 2,
      }
    );

    expect(result.units.length).toBeLessThanOrEqual(2);
  });

  it('returns empty chunks for blank content', async () => {
    const processor = new DocumentProcessor();
    const result = await processor.process('   ');

    expect(result.units).toEqual([]);
    expect(result.totalTokens).toBe(0);
    expect(result.qualityScore).toBe(0);
  });
});
