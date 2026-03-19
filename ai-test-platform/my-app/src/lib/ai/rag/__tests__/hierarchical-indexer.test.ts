import { prisma } from '@/lib/prisma';
import { runHierarchicalIndexJob } from '../hierarchical-indexer';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ragIndexBuild: {
      findFirst: jest.fn(),
    },
    ragHierarchicalIndexJob: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ragIndexCheckpoint: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    ragHierarchicalIndexNode: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

type MockNode = {
  id: string;
  jobId: string;
  parentId: string | null;
  level: number;
  nodeKey: string;
  clusterKey: string;
  summary: string;
  unitRefsJson: string;
  metadata: string;
};

function setupNodeAndCheckpointState() {
  const nodes: MockNode[] = [];
  const checkpoints: Array<{
    jobId: string;
    stage: string;
    cursor: number;
    payloadJson: string;
  }> = [];
  let nodeId = 1;

  (prisma.ragHierarchicalIndexNode.createMany as jest.Mock).mockImplementation(async ({ data }) => {
    for (const row of data) {
      nodes.push({
        id: `node-${nodeId++}`,
        ...row,
      });
    }
    return { count: data.length };
  });

  (prisma.ragHierarchicalIndexNode.findMany as jest.Mock).mockImplementation(async ({ where }) => {
    return nodes.filter((node) => {
      const matchesJob = !where?.jobId || node.jobId === where.jobId;
      const matchesLevel = where?.level === undefined || node.level === where.level;
      return matchesJob && matchesLevel;
    });
  });

  (prisma.ragHierarchicalIndexNode.count as jest.Mock).mockImplementation(async ({ where }) => {
    return nodes.filter((node) => !where?.jobId || node.jobId === where.jobId).length;
  });

  (prisma.ragIndexCheckpoint.create as jest.Mock).mockImplementation(async ({ data }) => {
    checkpoints.push({
      jobId: data.jobId,
      stage: data.stage,
      cursor: data.cursor,
      payloadJson: data.payloadJson,
    });
    return { id: `cp-${checkpoints.length}`, ...data };
  });

  (prisma.ragIndexCheckpoint.count as jest.Mock).mockImplementation(async ({ where }) => {
    return checkpoints.filter((checkpoint) => checkpoint.jobId === where.jobId).length;
  });

  return { nodes };
}

function setupCommonBuildMocks() {
  (prisma.ragIndexBuild.findFirst as jest.Mock).mockResolvedValue({
    id: 'build-1',
    version: 1,
    sourceType: 'KNOWLEDGE_ENTRY',
    sourceId: 'source-1',
    isActive: true,
    units: [
      { unitKey: 'u-1', content: 'segment one content', unitIndex: 0, tokenCount: 8 },
      { unitKey: 'u-2', content: 'segment two content', unitIndex: 1, tokenCount: 9 },
      { unitKey: 'u-3', content: 'segment three content', unitIndex: 2, tokenCount: 10 },
    ],
  });
  (prisma.ragHierarchicalIndexJob.update as jest.Mock).mockResolvedValue({});
  (prisma.ragHierarchicalIndexJob.findFirst as jest.Mock).mockResolvedValue(null);
}

describe('runHierarchicalIndexJob resume integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupCommonBuildMocks();
  });

  it('rebuilds missing L0 nodes before resuming from cluster-root checkpoint', async () => {
    const { nodes } = setupNodeAndCheckpointState();
    const rootClusters = [
      { clusterKey: 'root-0', unitKeys: ['u-1', 'u-2'] },
      { clusterKey: 'root-1', unitKeys: ['u-3'] },
    ];

    (prisma.ragHierarchicalIndexJob.findUnique as jest.Mock).mockResolvedValue({
      id: 'failed-job-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
      status: 'FAILED',
      updatedAt: new Date(),
    });
    (prisma.ragIndexCheckpoint.findFirst as jest.Mock).mockResolvedValue({
      id: 'cp-old-1',
      jobId: 'failed-job-1',
      stage: 'cluster-root',
      cursor: rootClusters.length,
      payloadJson: JSON.stringify({ rootClusters }),
      createdAt: new Date(),
    });
    (prisma.ragHierarchicalIndexJob.create as jest.Mock).mockResolvedValue({
      id: 'job-new-1',
    });

    const result = await runHierarchicalIndexJob({
      actorId: 'user-1',
      action: 'resume',
      jobId: 'failed-job-1',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
    });

    const rootNodes = nodes.filter((node) => node.level === 0);
    const subNodes = nodes.filter((node) => node.level === 1);
    const leafNodes = nodes.filter((node) => node.level === 2);
    const rootNodeIds = new Set(rootNodes.map((node) => node.id));
    const subNodeIds = new Set(subNodes.map((node) => node.id));

    expect(result.status).toBe('COMPLETED');
    expect(rootNodes.length).toBeGreaterThan(0);
    expect(subNodes.length).toBeGreaterThan(0);
    expect(leafNodes.length).toBe(3);
    expect(subNodes.every((node) => node.parentId !== null && rootNodeIds.has(node.parentId))).toBe(true);
    expect(leafNodes.every((node) => node.parentId !== null && subNodeIds.has(node.parentId))).toBe(true);
  });

  it('rehydrates L0/L1 nodes before finalizing when resuming from cluster-sub checkpoint', async () => {
    const { nodes } = setupNodeAndCheckpointState();
    const rootClusters = [
      { clusterKey: 'root-0', unitKeys: ['u-1', 'u-2'] },
      { clusterKey: 'root-1', unitKeys: ['u-3'] },
    ];
    const subClusters = [
      { parentClusterKey: 'root-0', clusterKey: 'root-0-sub-0', unitKeys: ['u-1', 'u-2'] },
      { parentClusterKey: 'root-1', clusterKey: 'root-1-sub-0', unitKeys: ['u-3'] },
    ];

    (prisma.ragHierarchicalIndexJob.findUnique as jest.Mock).mockResolvedValue({
      id: 'failed-job-2',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
      status: 'FAILED',
      updatedAt: new Date(),
    });
    (prisma.ragIndexCheckpoint.findFirst as jest.Mock).mockResolvedValue({
      id: 'cp-old-2',
      jobId: 'failed-job-2',
      stage: 'cluster-sub',
      cursor: subClusters.length,
      payloadJson: JSON.stringify({ rootClusters, subClusters }),
      createdAt: new Date(),
    });
    (prisma.ragHierarchicalIndexJob.create as jest.Mock).mockResolvedValue({
      id: 'job-new-2',
    });

    const result = await runHierarchicalIndexJob({
      actorId: 'user-1',
      action: 'resume',
      jobId: 'failed-job-2',
      sourceType: 'KNOWLEDGE_ENTRY',
      sourceId: 'source-1',
    });

    const rootNodes = nodes.filter((node) => node.level === 0);
    const subNodes = nodes.filter((node) => node.level === 1);
    const leafNodes = nodes.filter((node) => node.level === 2);
    const rootNodeIds = new Set(rootNodes.map((node) => node.id));
    const subNodeIds = new Set(subNodes.map((node) => node.id));

    expect(result.status).toBe('COMPLETED');
    expect(rootNodes).toHaveLength(2);
    expect(subNodes).toHaveLength(2);
    expect(leafNodes).toHaveLength(3);
    expect(subNodes.every((node) => node.parentId !== null && rootNodeIds.has(node.parentId))).toBe(true);
    expect(leafNodes.every((node) => node.parentId !== null && subNodeIds.has(node.parentId))).toBe(true);
  });
});
