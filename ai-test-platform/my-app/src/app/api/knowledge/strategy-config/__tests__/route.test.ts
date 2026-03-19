import { GET, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getLatestRagStrategyConfig,
  resolveRagStrategyConfig,
  saveRagStrategyConfig,
} from '@/lib/ai/rag/strategy-config';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/strategy-config', () => ({
  getLatestRagStrategyConfig: jest.fn(),
  resolveRagStrategyConfig: jest.fn(),
  saveRagStrategyConfig: jest.fn(),
}));

describe('/api/knowledge/strategy-config route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/strategy-config') as never
    );

    expect(response.status).toBe(401);
  });

  it('GET returns default strategy when no persisted config', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getLatestRagStrategyConfig as jest.Mock).mockResolvedValue(null);
    (resolveRagStrategyConfig as jest.Mock).mockResolvedValue({
      version: 0,
      source: 'default',
      toggles: {
        multiQuery: false,
        hyde: true,
        decomposition: false,
        fusion: false,
      },
    });

    const response = await GET(
      new Request('http://localhost/api/knowledge/strategy-config') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.version).toBe(0);
    expect(payload.data.source).toBe('default');
  });

  it('GET returns 403 when project is forbidden', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/knowledge/strategy-config?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('PUT returns 400 for missing toggles', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/strategy-config', {
        method: 'PUT',
        body: JSON.stringify({ projectId: 'project-1', toggles: {} }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT returns 403 when project is forbidden', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await PUT(
      new Request('http://localhost/api/knowledge/strategy-config', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          toggles: { fusion: true },
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('PUT persists strategy config and writes audit log', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (saveRagStrategyConfig as jest.Mock).mockResolvedValue({
      id: 'cfg-1',
      projectId: 'project-1',
      version: 2,
      multiQuery: true,
      hyde: true,
      decomposition: false,
      fusion: true,
    });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/strategy-config', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          toggles: {
            multiQuery: true,
            fusion: true,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.version).toBe(2);
    expect(saveRagStrategyConfig).toHaveBeenCalledWith({
      actorId: 'user-1',
      projectId: 'project-1',
      toggles: {
        multiQuery: true,
        fusion: true,
      },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        action: 'RAG_STRATEGY_CONFIG_UPDATED',
      })
    );
  });
});
