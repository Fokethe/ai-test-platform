import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getLatestEmbeddingStrategyConfig,
  listAvailableEmbeddingStrategies,
  resolveEmbeddingStrategyConfig,
  saveEmbeddingStrategyConfig,
} from '@/lib/ai/rag/embedding-strategies';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/embedding-strategies', () => ({
  getLatestEmbeddingStrategyConfig: jest.fn(),
  listAvailableEmbeddingStrategies: jest.fn(),
  resolveEmbeddingStrategyConfig: jest.fn(),
  saveEmbeddingStrategyConfig: jest.fn(),
}));

describe('/api/knowledge/embedding-strategies route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listAvailableEmbeddingStrategies as jest.Mock).mockReturnValue([
      { name: 'default-hash', dimension: 128 },
      { name: 'colbert-lite', dimension: 96 },
    ]);
  });

  it('GET returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/embedding-strategies') as never
    );

    expect(response.status).toBe(401);
  });

  it('GET returns 403 when project access denied', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/embedding-strategies?projectId=project-1'
      ) as never
    );

    expect(response.status).toBe(403);
  });

  it('GET returns active and effective strategy metadata', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (getLatestEmbeddingStrategyConfig as jest.Mock).mockResolvedValue({
      id: 'cfg-1',
      strategyName: 'colbert-lite',
      dimension: 96,
      fallbackTo: 'default-hash',
      version: 2,
    });
    (resolveEmbeddingStrategyConfig as jest.Mock).mockResolvedValue({
      strategyName: 'colbert-lite',
      dimension: 96,
      fallbackTo: 'default-hash',
      version: 2,
      source: 'persisted',
    });

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/embedding-strategies?projectId=project-1'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.activeConfig.strategyName).toBe('colbert-lite');
    expect(payload.data.effective.source).toBe('persisted');
  });

  it('PUT returns 400 when strategy save fails', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (saveEmbeddingStrategyConfig as jest.Mock).mockRejectedValue(
      new Error('Unknown embedding strategy')
    );

    const response = await PUT(
      new Request('http://localhost/api/knowledge/embedding-strategies', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          strategyName: 'unknown',
          dimension: 64,
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT saves strategy and writes audit log', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (saveEmbeddingStrategyConfig as jest.Mock).mockResolvedValue({
      id: 'cfg-2',
      projectId: 'project-1',
      strategyName: 'high-recall',
      dimension: 256,
      fallbackTo: 'default-hash',
      version: 3,
    });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/embedding-strategies', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          strategyName: 'high-recall',
          dimension: 256,
          fallbackTo: 'default-hash',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.version).toBe(3);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_EMBEDDING_STRATEGY_UPDATED',
      })
    );
  });
});
