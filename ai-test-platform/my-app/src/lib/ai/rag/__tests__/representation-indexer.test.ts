import { prisma } from '@/lib/prisma';
import { buildMultiRepresentationIndex } from '../representation-indexer';
import { generateEmbeddingsWithStrategy } from '@/lib/ai/rag/embedding-strategies';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ragIndexBuild: {
      findFirst: jest.fn(),
    },
    ragVectorIndexEntry: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    ragGraphIndexNode: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/rag/embedding-strategies', () => ({
  generateEmbeddingsWithStrategy: jest.fn(),
}));

function mockActiveBuild(unitContent = 'segment one content') {
  (prisma.ragIndexBuild.findFirst as jest.Mock).mockResolvedValue({
    id: 'build-1',
    version: 1,
    sourceType: 'KNOWLEDGE_ENTRY',
    sourceId: 'source-1',
    projectId: 'project-1',
    isActive: true,
    units: [
      {
        unitKey: 'u-1',
        content: unitContent,
        tokenCount: 10,
        unitIndex: 0,
      },
    ],
  });
}

function mockEmbeddings() {
  (generateEmbeddingsWithStrategy as jest.Mock).mockResolvedValue({
    vectors: [[0.1], [0.2]],
    strategyNameUsed: 'default-hash',
    configuredStrategyName: 'default-hash',
    configVersion: 1,
    dimension: 1,
    fallbackApplied: false,
    source: 'default',
  });
}

describe('buildMultiRepresentationIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveBuild();
    mockEmbeddings();
    (prisma.ragVectorIndexEntry.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.ragGraphIndexNode.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  it('marks failedStage as graph when first graph write fails', async () => {
    let vectorCounter = 1;
    (prisma.ragVectorIndexEntry.create as jest.Mock).mockImplementation(async () => ({
      id: `vec-${vectorCounter++}`,
    }));
    (prisma.ragGraphIndexNode.create as jest.Mock).mockRejectedValueOnce(
      new Error('GRAPH_WRITE_FAILED')
    );

    const result = await buildMultiRepresentationIndex({
      actorId: 'user-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
      projectId: 'project-1',
    });

    expect(result.compensationApplied).toBe(true);
    expect(result.failedStage).toBe('graph');
    expect(prisma.ragVectorIndexEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['vec-1', 'vec-2'] } },
    });
    expect(prisma.ragGraphIndexNode.deleteMany).not.toHaveBeenCalled();
  });

  it('marks failedStage as vector when vector write fails before graph stage', async () => {
    (prisma.ragVectorIndexEntry.create as jest.Mock).mockRejectedValueOnce(
      new Error('VECTOR_WRITE_FAILED')
    );

    const result = await buildMultiRepresentationIndex({
      actorId: 'user-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
      projectId: 'project-1',
    });

    expect(result.compensationApplied).toBe(true);
    expect(result.failedStage).toBe('vector');
    expect(prisma.ragGraphIndexNode.create).not.toHaveBeenCalled();
  });

  it('uses Chinese punctuation as sentence boundary when building summary', async () => {
    const longChineseContent =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\u3002bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    mockActiveBuild(longChineseContent);

    let vectorCounter = 1;
    (prisma.ragVectorIndexEntry.create as jest.Mock).mockImplementation(async () => ({
      id: `vec-${vectorCounter++}`,
    }));
    (prisma.ragGraphIndexNode.create as jest.Mock).mockResolvedValue({ id: 'graph-1' });

    const result = await buildMultiRepresentationIndex({
      actorId: 'user-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
      projectId: 'project-1',
      summaryMaxChars: 60,
    });

    const firstVectorWrite = (prisma.ragVectorIndexEntry.create as jest.Mock).mock.calls[0][0].data;
    expect(result.compensationApplied).toBe(false);
    expect(firstVectorWrite.summary.endsWith('\u3002')).toBe(true);
    expect(firstVectorWrite.summary).not.toContain('...');
  });
});
