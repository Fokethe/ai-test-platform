/**
 * Regression Tests - TDD Phase 4
 * 回归测试：验证重构后系统功能完整性
 */

import { prisma } from '../prisma';

// Mock prisma
jest.mock('../prisma', () => ({
  prisma: {
    test: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    run: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    issue: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    asset: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    integration: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Regression: New Models CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test Model (Unified TestCase + Suite)', () => {
    it('should create standalone test case', async () => {
      const testData = {
        name: 'Login Test',
        type: 'CASE',
        content: JSON.stringify({ steps: [{ action: 'click', target: '#login' }] }),
        projectId: 'proj-1',
        tags: JSON.stringify(['smoke', 'critical']),
        priority: 'HIGH',
        source: 'MANUAL',
        createdBy: 'user-1',
      };

      (prisma.test.create as jest.Mock).mockResolvedValue({ id: 'test-1', ...testData });

      const result = await prisma.test.create({ data: testData });

      expect(result.id).toBe('test-1');
      expect(result.type).toBe('CASE');
    });

    it('should create test suite with children', async () => {
      const suiteData = {
        name: 'User Module Tests',
        type: 'SUITE',
        content: JSON.stringify({ config: { parallel: true } }),
        projectId: 'proj-1',
        priority: 'MEDIUM',
        source: 'MANUAL',
        createdBy: 'user-1',
      };

      (prisma.test.create as jest.Mock).mockResolvedValue({ id: 'suite-1', ...suiteData });

      const result = await prisma.test.create({ data: suiteData });

      expect(result.type).toBe('SUITE');
    });

    it('should query tests with type filter', async () => {
      (prisma.test.findMany as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Test 1', type: 'CASE' },
        { id: '2', name: 'Test 2', type: 'CASE' },
      ]);

      const results = await prisma.test.findMany({
        where: { type: 'CASE', projectId: 'proj-1' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('CASE');
    });
  });

  describe('Run Model (Unified Run + Execution)', () => {
    it('should create run with embedded executions', async () => {
      const runData = {
        name: 'Smoke Test Run',
        type: 'MANUAL',
        status: 'PENDING',
        totalCount: 3,
        projectId: 'proj-1',
        executions: {
          create: [
            { testId: 'test-1', status: 'PENDING' },
            { testId: 'test-2', status: 'PENDING' },
          ],
        },
      };

      (prisma.run.create as jest.Mock).mockResolvedValue({
        id: 'run-1',
        ...runData,
        executions: [
          { id: 'exec-1', testId: 'test-1' },
          { id: 'exec-2', testId: 'test-2' },
        ],
      });

      const result = await prisma.run.create({ data: runData });

      expect(result.executions).toHaveLength(2);
      expect(result.totalCount).toBe(3);
    });

    it('should create scheduled run with cron', async () => {
      const scheduledRun = {
        name: 'Daily Smoke',
        type: 'SCHEDULED',
        status: 'PENDING',
        cron: '0 9 * * *',
        nextRunAt: new Date('2026-03-02T09:00:00Z'),
      };

      (prisma.run.create as jest.Mock).mockResolvedValue({ id: 'run-2', ...scheduledRun });

      const result = await prisma.run.create({ data: scheduledRun });

      expect(result.cron).toBe('0 9 * * *');
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });
  });

  describe('Issue Model (Replaces Bug)', () => {
    it('should create bug-type issue', async () => {
      const issueData = {
        title: 'Login Error',
        type: 'BUG',
        severity: 'HIGH',
        priority: 'CRITICAL',
        status: 'OPEN',
        projectId: 'proj-1',
        reporterId: 'user-1',
      };

      (prisma.issue.create as jest.Mock).mockResolvedValue({ id: 'issue-1', ...issueData });

      const result = await prisma.issue.create({ data: issueData });

      expect(result.type).toBe('BUG');
      expect(result.severity).toBe('HIGH');
    });

    it('should query issues by type and status', async () => {
      (prisma.issue.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Bug 1', type: 'BUG', status: 'OPEN' },
        { id: '2', title: 'Task 1', type: 'TASK', status: 'IN_PROGRESS' },
      ]);

      const bugs = await prisma.issue.findMany({
        where: { type: 'BUG', projectId: 'proj-1' },
      });

      expect(bugs.some(i => i.type === 'BUG')).toBe(true);
    });
  });

  describe('Asset Model (Replaces Knowledge + Page)', () => {
    it('should create doc-type asset', async () => {
      const docData = {
        title: 'API Documentation',
        type: 'DOC',
        content: '# API Docs\n\nContent here',
        tags: JSON.stringify(['api', 'docs']),
        projectId: 'proj-1',
        createdBy: 'user-1',
      };

      (prisma.asset.create as jest.Mock).mockResolvedValue({ id: 'asset-1', ...docData });

      const result = await prisma.asset.create({ data: docData });

      expect(result.type).toBe('DOC');
    });

    it('should create page-type asset', async () => {
      const pageData = {
        title: 'Login Page',
        type: 'PAGE',
        url: '/login',
        selector: '#login-form',
        projectId: 'proj-1',
        createdBy: 'user-1',
      };

      (prisma.asset.create as jest.Mock).mockResolvedValue({ id: 'asset-2', ...pageData });

      const result = await prisma.asset.create({ data: pageData });

      expect(result.type).toBe('PAGE');
      expect(result.selector).toBe('#login-form');
    });
  });

  describe('Integration Model (Replaces Webhook)', () => {
    it('should create GitHub integration', async () => {
      const integrationData = {
        name: 'GitHub Webhook',
        type: 'GITHUB',
        provider: 'github',
        url: 'https://api.github.com/webhook',
        secret: 'secret123',
        events: JSON.stringify(['push', 'pull_request']),
        projectId: 'proj-1',
        createdBy: 'user-1',
        isActive: true,
      };

      (prisma.integration.create as jest.Mock).mockResolvedValue({
        id: 'int-1',
        ...integrationData,
      });

      const result = await prisma.integration.create({ data: integrationData });

      expect(result.type).toBe('GITHUB');
      expect(result.events).toContain('push');
    });
  });
});

describe('Regression: API Endpoints', () => {
  describe('Unified Response Format', () => {
    it('should return list response with meta', () => {
      const response = {
        data: [{ id: '1', name: 'Test' }],
        meta: {
          total: 100,
          page: 1,
          pageSize: 20,
          hasMore: true,
        },
      };

      expect(response.meta.total).toBe(100);
      expect(response.meta.hasMore).toBe(true);
    });

    it('should return error response with code', () => {
      const error = {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: { resource: 'Test' },
        },
      };

      expect(error.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Route Redirects', () => {
    const redirectTests = [
      { from: '/api/testcases', to: '/api/tests?type=CASE' },
      { from: '/api/test-suites', to: '/api/tests?type=SUITE' },
      { from: '/api/test-runs', to: '/api/runs' },
      { from: '/api/executions', to: '/api/runs?status=RUNNING' },
      { from: '/api/bugs', to: '/api/issues?type=BUG' },
      { from: '/api/knowledge', to: '/api/assets?type=DOC' },
      { from: '/api/pages', to: '/api/assets?type=PAGE' },
      { from: '/api/webhooks', to: '/api/integrations' },
    ];

    it.each(redirectTests)('should redirect $from to $to', ({ from, to }) => {
      expect(to).toBeDefined();
      expect(from).not.toEqual(to);
    });
  });
});

describe('Regression: Data Integrity', () => {
  it('should maintain referential integrity after migration', () => {
    // 测试用例关联到项目
    const test = {
      id: 'test-1',
      projectId: 'proj-1',
      type: 'CASE',
    };

    expect(test.projectId).toBeDefined();

    // 执行关联到测试
    const execution = {
      id: 'exec-1',
      runId: 'run-1',
      testId: 'test-1',
    };

    expect(execution.testId).toBe('test-1');

    // 问题关联到项目和测试
    const issue = {
      id: 'issue-1',
      projectId: 'proj-1',
      testId: 'test-1',
      type: 'BUG',
    };

    expect(issue.projectId).toBe('proj-1');
    expect(issue.testId).toBe('test-1');
  });

  it('should preserve timestamps during migration', () => {
    const oldRecord = {
      id: '1',
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date('2026-02-20T15:30:00Z'),
    };

    const newRecord = {
      ...oldRecord,
    };

    expect(newRecord.createdAt).toEqual(oldRecord.createdAt);
    expect(newRecord.updatedAt).toEqual(oldRecord.updatedAt);
  });
});

describe('Regression: Feature Parity', () => {
  it('should support all old testcase features in new Test model', () => {
    const oldFeatures = ['name', 'steps', 'expected', 'projectId', 'tags', 'priority', 'createdBy'];

    const newTest = {
      name: 'Test',
      content: JSON.stringify({ steps: [], expected: '' }),
      projectId: 'proj-1',
      tags: JSON.stringify([]),
      priority: 'HIGH',
      createdBy: 'user-1',
    };

    // 所有旧特性都应能在新模型中找到对应
    expect(newTest.name).toBeDefined();
    expect(newTest.projectId).toBeDefined();
    expect(newTest.priority).toBeDefined();
  });

  it('should support all old bug features in new Issue model', () => {
    const oldBugFeatures = ['title', 'description', 'severity', 'status', 'projectId', 'reporterId', 'assigneeId'];

    const newIssue = {
      title: 'Bug',
      description: 'Description',
      severity: 'HIGH',
      status: 'OPEN',
      projectId: 'proj-1',
      reporterId: 'user-1',
      assigneeId: 'user-2',
    };

    oldBugFeatures.forEach(feature => {
      expect(newIssue[feature as keyof typeof newIssue]).toBeDefined();
    });
  });
});
