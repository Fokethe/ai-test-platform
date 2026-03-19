import { GET, POST, PUT } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getActivePromptTemplates,
  listPromptTemplateVersions,
  rollbackPromptTemplateVersion,
  savePromptTemplateVersion,
} from '@/lib/ai/rag/semantic-routing';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/semantic-routing', () => ({
  getActivePromptTemplates: jest.fn(),
  listPromptTemplateVersions: jest.fn(),
  savePromptTemplateVersion: jest.fn(),
  rollbackPromptTemplateVersion: jest.fn(),
  selectPromptTemplate: jest.fn(),
}));

describe('/api/knowledge/prompt-templates route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/knowledge/prompt-templates') as never
    );

    expect(response.status).toBe(401);
  });

  it('GET returns 403 when project is forbidden', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/knowledge/prompt-templates?projectId=project-1') as never
    );

    expect(response.status).toBe(403);
  });

  it('GET returns active templates and version history', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getActivePromptTemplates as jest.Mock).mockResolvedValue([
      {
        id: 'tpl-1',
        scenario: 'bug-analysis',
        name: 'Bug Analyst',
        version: 2,
        template: 'Template {{query}}',
        keywords: ['bug', 'issue'],
      },
    ]);
    (listPromptTemplateVersions as jest.Mock).mockResolvedValue([
      { id: 'tpl-1', scenario: 'bug-analysis', version: 2, isActive: true },
      { id: 'tpl-0', scenario: 'bug-analysis', version: 1, isActive: false },
    ]);

    const response = await GET(
      new Request('http://localhost/api/knowledge/prompt-templates') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.activeTemplates).toHaveLength(1);
    expect(payload.data.versions).toHaveLength(2);
  });

  it('PUT returns 400 for invalid payload', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/prompt-templates', {
        method: 'PUT',
        body: JSON.stringify({ scenario: 'default' }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it('PUT saves template version and writes audit log', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (savePromptTemplateVersion as jest.Mock).mockResolvedValue({
      id: 'tpl-2',
      projectId: 'project-1',
      scenario: 'bug-analysis',
      version: 3,
      name: 'Bug Analyst v3',
      template: 'Template {{query}}',
      keywords: JSON.stringify(['bug', 'error']),
    });

    const response = await PUT(
      new Request('http://localhost/api/knowledge/prompt-templates', {
        method: 'PUT',
        body: JSON.stringify({
          projectId: 'project-1',
          scenario: 'bug-analysis',
          name: 'Bug Analyst v3',
          template: 'Template {{query}}',
          keywords: ['bug', 'error'],
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.version).toBe(3);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_PROMPT_TEMPLATE_UPDATED',
      })
    );
  });

  it('POST returns 404 when rollback target is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (rollbackPromptTemplateVersion as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/prompt-templates', {
        method: 'POST',
        body: JSON.stringify({
          scenario: 'default',
          rollbackToVersion: 1,
        }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it('POST rolls back template and returns new version metadata', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (rollbackPromptTemplateVersion as jest.Mock).mockResolvedValue({
      rollbackFromVersion: 2,
      saved: {
        id: 'tpl-4',
        projectId: 'project-1',
        scenario: 'bug-analysis',
        version: 4,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/prompt-templates', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          scenario: 'bug-analysis',
          rollbackToVersion: 2,
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.version).toBe(4);
    expect(payload.data.rollbackFromVersion).toBe(2);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_PROMPT_TEMPLATE_ROLLBACK',
      })
    );
  });
});
