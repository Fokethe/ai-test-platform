import { GET, POST, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getLatestRoutingRuleSet,
  listRoutingRuleVersions,
  rollbackRoutingRuleSet,
  saveRoutingRuleSet,
} from '@/lib/ai/rag/logic-routing';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/logic-routing', () => ({
  getLatestRoutingRuleSet: jest.fn(),
  listRoutingRuleVersions: jest.fn(),
  parseRoutingRules: jest.fn((rules) => rules),
  rollbackRoutingRuleSet: jest.fn(),
  saveRoutingRuleSet: jest.fn(),
}));

describe('/api/knowledge/routing-rules route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/routing-rules') as never
    );

    expect(response.status).toBe(401);
  });

  it('GET returns 403 when project access is denied', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/knowledge/routing-rules?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('GET returns active routing rules and versions', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getLatestRoutingRuleSet as jest.Mock).mockResolvedValue({
      id: 'rr-1',
      version: 3,
      rulesJson: JSON.stringify([
        {
          id: 'rule-1',
          name: 'Graph for relation question',
          priority: 100,
          enabled: true,
          mode: 'ALL',
          conditions: [{ field: 'query', operator: 'contains', value: '关系' }],
          targetSources: ['graph'],
        },
      ]),
    });
    (listRoutingRuleVersions as jest.Mock).mockResolvedValue([
      { id: 'rr-1', version: 3, isActive: true },
      { id: 'rr-0', version: 2, isActive: false },
    ]);

    const response = await GET(
      new Request('http://localhost/api/knowledge/routing-rules') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.activeVersion).toBe(3);
    expect(payload.data.rules).toHaveLength(1);
  });

  it('PUT returns 400 when payload is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/routing-rules', {
        method: 'PUT',
        body: JSON.stringify({ rules: [{ id: '1' }] }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT persists new routing rule set and writes audit', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (saveRoutingRuleSet as jest.Mock).mockResolvedValue({
      id: 'rr-2',
      projectId: 'project-1',
      version: 4,
    });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/routing-rules', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          rules: [
            {
              id: 'rule-1',
              name: 'Graph rule',
              priority: 100,
              enabled: true,
              mode: 'ALL',
              conditions: [{ field: 'query', operator: 'contains', value: 'graph' }],
              targetSources: ['graph'],
            },
          ],
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.version).toBe(4);
    expect(saveRoutingRuleSet).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        projectId: 'project-1',
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_ROUTING_RULES_UPDATED',
      })
    );
  });

  it('POST returns 404 when rollback version does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (rollbackRoutingRuleSet as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/routing-rules', {
        method: 'POST',
        body: JSON.stringify({
          rollbackToVersion: 1,
        }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it('POST rolls back and creates a new active version', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (rollbackRoutingRuleSet as jest.Mock).mockResolvedValue({
      rollbackFromVersion: 2,
      saved: {
        id: 'rr-3',
        projectId: 'project-1',
        version: 5,
      },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/knowledge/routing-rules', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          rollbackToVersion: 2,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.version).toBe(5);
    expect(payload.data.rollbackFromVersion).toBe(2);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_ROUTING_RULES_ROLLBACK',
      })
    );
  });
});
