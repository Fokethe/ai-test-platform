import { prisma } from '@/lib/prisma';
import { saveEmbeddingStrategyConfig } from '../embedding-strategies';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ragEmbeddingStrategyConfig: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('saveEmbeddingStrategyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.ragEmbeddingStrategyConfig.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('rejects config when dimension does not match strategy plugin dimension', async () => {
    await expect(
      saveEmbeddingStrategyConfig({
        actorId: 'user-1',
        projectId: 'project-1',
        strategyName: 'colbert-lite',
        dimension: 128,
        fallbackTo: 'default-hash',
      })
    ).rejects.toThrow('Dimension mismatch for strategy "colbert-lite": expected 96, got 128');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persists plugin dimension when config is valid', async () => {
    (prisma.ragEmbeddingStrategyConfig.findFirst as jest.Mock).mockResolvedValue({
      version: 2,
    });

    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({
      id: 'cfg-3',
      strategyName: 'colbert-lite',
      dimension: 96,
      version: 3,
      projectId: 'project-1',
      isActive: true,
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        ragEmbeddingStrategyConfig: {
          updateMany,
          create,
        },
      })
    );

    const result = await saveEmbeddingStrategyConfig({
      actorId: 'user-1',
      projectId: 'project-1',
      strategyName: 'colbert-lite',
      dimension: 96,
      fallbackTo: 'default-hash',
    });

    expect(result.dimension).toBe(96);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategyName: 'colbert-lite',
          dimension: 96,
          version: 3,
          isActive: true,
        }),
      })
    );
  });
});
