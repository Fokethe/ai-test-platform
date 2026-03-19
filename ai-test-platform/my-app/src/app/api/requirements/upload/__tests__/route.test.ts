import { POST } from '../route';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { persistRequirementIngestion } from '@/lib/requirements/ingestion';

const mockParseDocument = jest.fn();
const mockParseRequirement = jest.fn();

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/project-access', () => ({
  hasProjectAccess: jest.fn(),
}));

jest.mock('@/lib/requirements/ingestion', () => ({
  persistRequirementIngestion: jest.fn(),
}));

jest.mock('@/lib/ai/agents/document-parser', () => ({
  DocumentParser: jest.fn().mockImplementation(() => ({
    parse: mockParseDocument,
  })),
}));

jest.mock('@/lib/ai/agents/requirement-parser', () => ({
  RequirementParser: jest.fn().mockImplementation(() => ({
    parse: mockParseRequirement,
  })),
}));

describe('POST /api/requirements/upload', () => {
  const buildUploadRequest = (formData: FormData) =>
    ({
      formData: jest.fn().mockResolvedValue(formData),
    } as never);

  const buildFormData = (values: Record<string, unknown>) =>
    ({
      get: (key: string) => (key in values ? values[key] : null),
    } as FormData);

  beforeEach(() => {
    jest.clearAllMocks();

    (hasProjectAccess as jest.Mock).mockResolvedValue(true);
    mockParseDocument.mockResolvedValue({
      type: 'txt',
      filename: 'req.txt',
      title: 'Uploaded Requirement',
      content: 'Requirement content for login flow.',
      rawText: 'Requirement content for login flow.',
      size: 35,
    });
    mockParseRequirement.mockResolvedValue({
      rawText: 'Requirement content for login flow.',
      features: ['Login'],
      businessRules: [],
      testPoints: [
        {
          id: 'TP-1-P',
          name: 'Login success',
          description: 'Valid login',
          priority: 'P0',
          relatedFeature: 'Login',
        },
      ],
    });
    (persistRequirementIngestion as jest.Mock).mockResolvedValue({
      id: 'req-upload-1',
      projectId: 'project-1',
      title: 'Uploaded Requirement',
      testPointGroups: [{ feature: 'Login', points: [] }],
    });
  });

  it('returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const formData = buildFormData({
      projectId: 'project-1',
      file: {
        name: 'req.txt',
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/requirements/upload', {
        method: 'POST',
        body: formData,
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 when file is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const formData = buildFormData({
      projectId: 'project-1',
    });

    const response = await POST(buildUploadRequest(formData));

    expect(response.status).toBe(400);
  });

  it('returns 403 when user has no access to project', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });
    (hasProjectAccess as jest.Mock).mockResolvedValue(false);

    const formData = buildFormData({
      projectId: 'project-1',
      file: {
        name: 'req.txt',
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      },
    });

    const response = await POST(buildUploadRequest(formData));

    expect(response.status).toBe(403);
  });

  it('returns grouped output when upload succeeds', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const formData = buildFormData({
      projectId: 'project-1',
      file: {
        name: 'req.txt',
        arrayBuffer: async () => new Uint8Array([104, 101, 108, 108, 111]).buffer,
      },
    });

    const response = await POST(buildUploadRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.id).toBe('req-upload-1');
    expect(hasProjectAccess).toHaveBeenCalledWith('user-1', 'project-1');
    expect(mockParseDocument).toHaveBeenCalled();
    expect(mockParseRequirement).toHaveBeenCalledWith('Requirement content for login flow.');
    expect(persistRequirementIngestion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        createdBy: 'user-1',
      })
    );
  });
});
