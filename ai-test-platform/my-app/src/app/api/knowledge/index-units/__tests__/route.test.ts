import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  buildSemanticIndexUnits,
  getActiveIndexBuild,
  listIndexBuildVersions,
  loadIndexSource,
} from '@/lib/ai/rag/index-unit-builder';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('@/lib/ai/rag/index-unit-builder', () => ({
  loadIndexSource: jest.fn(),
  buildSemanticIndexUnits: jest.fn(),
  getActiveIndexBuild: jest.fn(),
  listIndexBuildVersions: jest.fn(),
}));

describe('/api/knowledge/index-units route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-units', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('POST returns 404 when source does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-units', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it('POST returns 403 for inaccessible project', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      title: 'title',
      content: 'content',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-units', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('POST builds semantic index units and returns versioned result', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (loadIndexSource as jest.Mock).mockResolvedValue({
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-1',
      projectId: 'project-1',
      title: 'Login knowledge',
      content: 'line1. line2.',
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (buildSemanticIndexUnits as jest.Mock).mockResolvedValue({
      source: {
        sourceType: 'KNOWLEDGE_ENTRY',
        sourceId: 'k-1',
        projectId: 'project-1',
        title: 'Login knowledge',
        content: 'line1. line2.',
      },
      build: {
        id: 'build-1',
        version: 2,
        qualityScore: 0.91,
        unitCount: 2,
        strategyJson: JSON.stringify({
          targetChunkSize: 300,
        }),
      },
      processResult: {
        id: 1,
        chunks: ['line1.', 'line2.'],
        units: [
          {
            index: 0,
            content: 'line1.',
            tokenCount: 3,
            sentenceCount: 1,
            startOffset: 0,
            endOffset: 6,
          },
        ],
        totalTokens: 3,
        qualityScore: 0.91,
        processedAt: new Date(),
      },
    });

    const response = await POST(
      new Request('http://localhost/api/knowledge/index-units', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'KNOWLEDGE_ENTRY',
          sourceId: 'k-1',
          options: {
            targetChunkSize: 300,
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.build.version).toBe(2);
    expect(payload.data.units).toHaveLength(1);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RAG_INDEX_BUILD_CREATED',
      })
    );
  });

  it('GET returns active build with versions', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getActiveIndexBuild as jest.Mock).mockResolvedValue({
      id: 'build-2',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'k-2',
      projectId: 'project-1',
      version: 3,
      qualityScore: 0.88,
      unitCount: 1,
      strategyJson: JSON.stringify({ targetChunkSize: 400 }),
      units: [
        {
          id: 'unit-1',
          unitKey: 'KNOWLEDGE_ENTRY:k-2:v3:u0',
          unitIndex: 0,
          content: 'segment',
          tokenCount: 5,
          startOffset: 0,
          endOffset: 7,
          metadata: JSON.stringify({ sentenceCount: 1 }),
        },
      ],
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    (listIndexBuildVersions as jest.Mock).mockResolvedValue([
      { id: 'build-2', version: 3, isActive: true },
      { id: 'build-1', version: 2, isActive: false },
    ]);

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/index-units?sourceType=KNOWLEDGE_ENTRY&sourceId=k-2'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.activeBuild.version).toBe(3);
    expect(payload.data.activeBuild.units).toHaveLength(1);
    expect(payload.data.versions).toHaveLength(2);
  });

  it('GET returns empty result when build does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (getActiveIndexBuild as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request(
        'http://localhost/api/knowledge/index-units?sourceType=KNOWLEDGE_ENTRY&sourceId=missing'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.activeBuild).toBeNull();
    expect(payload.data.versions).toEqual([]);
  });
});
