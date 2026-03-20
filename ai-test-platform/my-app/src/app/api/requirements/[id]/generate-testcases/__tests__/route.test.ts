import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { ModelManager } from '@/lib/ai/model-manager';
import { TestCaseGenerator } from '@/lib/ai/agents/testcase-generator';

const mockGenerateFromTestPointsWithRAG = jest.fn();
const mockGenerateFromTestPoint = jest.fn();
const mockGetUsageStats = jest.fn();
const mockGetTotalCost = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    aiRequirement: {
      findUnique: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/model-manager', () => ({
  ModelManager: jest.fn().mockImplementation(() => ({
    getUsageStats: mockGetUsageStats,
    getTotalCost: mockGetTotalCost,
  })),
}));

jest.mock('@/lib/ai/agents/testcase-generator', () => ({
  TestCaseGenerator: jest.fn().mockImplementation(() => ({
    generateFromTestPointsWithRAG: mockGenerateFromTestPointsWithRAG,
    generateFromTestPoint: mockGenerateFromTestPoint,
  })),
}));

type MockedPrisma = {
  aiRequirement: { findUnique: jest.Mock };
  test: { findMany: jest.Mock };
};

const requirementFixture = {
  id: 'req-1',
  projectId: 'project-1',
  businessRules: JSON.stringify([{ type: 'format', description: 'Phone must be 11 digits' }]),
  features: JSON.stringify(['Login', 'SMS verification']),
  testPoints: [
    {
      id: 'tp-1',
      name: 'Valid phone login',
      description: 'Login with valid phone and SMS code',
      priority: 'P0',
      relatedFeature: 'Login',
    },
    {
      id: 'tp-2',
      name: 'Invalid phone handling',
      description: 'Show validation error for invalid phone',
      priority: 'P1',
      relatedFeature: 'Login',
    },
  ],
};

const generatedCase = {
  id: 'TC-tp-1-1',
  title: 'Valid phone login succeeds',
  precondition: 'User exists',
  steps: ['Input phone', 'Input SMS code', 'Submit'],
  expectedResult: 'Login success',
  priority: 'P0',
  testPointId: 'tp-1',
  relatedFeature: 'Login',
};

describe('POST /api/requirements/[id]/generate-testcases', () => {
  const mockedPrisma = prisma as unknown as MockedPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedPrisma.aiRequirement.findUnique.mockResolvedValue(requirementFixture);
    mockedPrisma.test.findMany.mockResolvedValue([]);

    mockGenerateFromTestPointsWithRAG.mockResolvedValue([generatedCase]);
    mockGenerateFromTestPoint.mockResolvedValue([generatedCase]);
    mockGetUsageStats.mockReturnValue({ 'kimi-k2.5': 1 });
    mockGetTotalCost.mockReturnValue(0.001);
  });

  it('returns generated test cases for selected test points', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(payload.data.testCases).toHaveLength(1);
    expect(payload.data.testCases[0]).toMatchObject({
      title: 'Valid phone login succeeds',
      testPointId: 'tp-1',
    });
    expect(payload.data.meta.generatedCount).toBe(1);
  });

  it('supports batch generation for multiple test points', async () => {
    mockGenerateFromTestPointsWithRAG.mockResolvedValue([
      generatedCase,
      {
        ...generatedCase,
        id: 'TC-tp-2-1',
        title: 'Invalid phone displays error',
        testPointId: 'tp-2',
        priority: 'P1',
      },
    ]);

    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1', 'tp-2'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.testCases).toHaveLength(2);
    expect(payload.data.meta.testPointCount).toBe(2);
  });

  it('returns 404 when requirement does not exist', async () => {
    mockedPrisma.aiRequirement.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      new Request('http://localhost/api/requirements/missing/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'missing' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.code).toBe(404);
  });

  it('returns 400 when testPointIds is empty', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: [] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe(400);
  });

  it('returns 400 when test point does not belong to requirement', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-404'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe(400);
  });

  it('falls back to non-RAG generation and passes business context', async () => {
    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1'], useRAG: false }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(response.status).toBe(200);
    expect(mockGenerateFromTestPoint).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tp-1' }),
      expect.objectContaining({
        businessRules: expect.arrayContaining([
          expect.objectContaining({ description: 'Phone must be 11 digits' }),
        ]),
        features: expect.arrayContaining(['Login', 'SMS verification']),
      })
    );
  });

  it('returns 500 when both RAG and fallback generation fail', async () => {
    mockGenerateFromTestPointsWithRAG.mockRejectedValueOnce(new Error('RAG unavailable'));
    mockGenerateFromTestPoint.mockRejectedValueOnce(new Error('AI unavailable'));

    const response = await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe(500);
  });

  it('initializes model and generator dependencies', async () => {
    await POST(
      new Request('http://localhost/api/requirements/req-1/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPointIds: ['tp-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'req-1' }) }
    );

    expect(ModelManager).toHaveBeenCalled();
    expect(TestCaseGenerator).toHaveBeenCalled();
  });
});
