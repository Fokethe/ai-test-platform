import { prisma } from '@/lib/prisma';
import { IndexSourceType } from '@/lib/ai/rag/index-unit-builder';

type HierarchicalStage = 'cluster-root' | 'cluster-sub' | 'finalize';

interface UnitRecord {
  unitKey: string;
  content: string;
  unitIndex: number;
  tokenCount: number;
}

interface RootCluster {
  clusterKey: string;
  unitKeys: string[];
}

interface SubCluster {
  parentClusterKey: string;
  clusterKey: string;
  unitKeys: string[];
}

export interface RunHierarchicalIndexInput {
  actorId: string;
  sourceType: IndexSourceType;
  sourceId: string;
  projectId?: string;
  action?: 'start' | 'resume';
  jobId?: string;
  simulateInterruptStage?: HierarchicalStage;
}

export interface HierarchicalIndexRunResult {
  jobId: string;
  sourceType: IndexSourceType;
  sourceId: string;
  status: 'COMPLETED' | 'FAILED';
  stage: string;
  nodeCount: number;
  checkpointCount: number;
  recoveredFromJobId?: string;
  recoveredWithinSla?: boolean;
  recoveryWindowMinutes: number;
  error?: string;
}

const RECOVERY_WINDOW_MINUTES = 10;

function normalizeProjectId(projectId?: string): string | null {
  if (!projectId) {
    return null;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function summarize(content: string, max = 140): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}...`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildRootClusters(units: UnitRecord[]): RootCluster[] {
  const groupSize = Math.max(2, Math.ceil(Math.sqrt(Math.max(units.length, 1))));
  const grouped = chunkArray(units, groupSize);
  return grouped.map((group, index) => ({
    clusterKey: `root-${index}`,
    unitKeys: group.map((unit) => unit.unitKey),
  }));
}

function buildSubClusters(rootClusters: RootCluster[]): SubCluster[] {
  const result: SubCluster[] = [];
  for (const root of rootClusters) {
    const groupSize = root.unitKeys.length > 6 ? 3 : 2;
    const groups = chunkArray(root.unitKeys, groupSize);
    groups.forEach((group, index) => {
      result.push({
        parentClusterKey: root.clusterKey,
        clusterKey: `${root.clusterKey}-sub-${index}`,
        unitKeys: group,
      });
    });
  }
  return result;
}

function buildUnitContentMap(units: UnitRecord[]): Map<string, string> {
  return new Map(units.map((unit) => [unit.unitKey, unit.content]));
}

function summarizeUnits(unitKeys: string[], unitContentMap: Map<string, string>): string {
  return summarize(unitKeys.map((key) => unitContentMap.get(key) || '').join(' '));
}

async function createRootNodes(input: {
  jobId: string;
  rootClusters: RootCluster[];
  unitContentMap: Map<string, string>;
}) {
  if (input.rootClusters.length === 0) {
    return;
  }

  await prisma.ragHierarchicalIndexNode.createMany({
    data: input.rootClusters.map((cluster) => ({
      jobId: input.jobId,
      parentId: null,
      level: 0,
      nodeKey: `${input.jobId}:${cluster.clusterKey}`,
      clusterKey: cluster.clusterKey,
      summary: summarizeUnits(cluster.unitKeys, input.unitContentMap),
      unitRefsJson: JSON.stringify(cluster.unitKeys),
      metadata: JSON.stringify({ kind: 'root' }),
    })),
  });
}

async function createSubNodes(input: {
  jobId: string;
  subClusters: SubCluster[];
  unitContentMap: Map<string, string>;
}) {
  if (input.subClusters.length === 0) {
    return;
  }

  const rootNodes = await prisma.ragHierarchicalIndexNode.findMany({
    where: {
      jobId: input.jobId,
      level: 0,
    },
  });
  const rootNodeByClusterKey = new Map(rootNodes.map((node) => [node.clusterKey, node.id]));
  const subNodeRows = input.subClusters.map((cluster) => {
    const parentId = rootNodeByClusterKey.get(cluster.parentClusterKey);
    if (!parentId) {
      throw new Error(`MISSING_ROOT_NODE:${cluster.parentClusterKey}`);
    }
    return {
      jobId: input.jobId,
      parentId,
      level: 1,
      nodeKey: `${input.jobId}:${cluster.clusterKey}`,
      clusterKey: cluster.clusterKey,
      summary: summarizeUnits(cluster.unitKeys, input.unitContentMap),
      unitRefsJson: JSON.stringify(cluster.unitKeys),
      metadata: JSON.stringify({ kind: 'sub' }),
    };
  });

  await prisma.ragHierarchicalIndexNode.createMany({
    data: subNodeRows,
  });
}

async function createCheckpoint(input: {
  jobId: string;
  stage: HierarchicalStage;
  cursor: number;
  payload: Record<string, unknown>;
}) {
  await prisma.ragIndexCheckpoint.create({
    data: {
      jobId: input.jobId,
      stage: input.stage,
      cursor: input.cursor,
      payloadJson: JSON.stringify(input.payload),
    },
  });
}

async function loadActiveBuildUnits(sourceType: IndexSourceType, sourceId: string): Promise<UnitRecord[]> {
  const activeBuild = await prisma.ragIndexBuild.findFirst({
    where: {
      sourceType,
      sourceId,
      isActive: true,
    },
    include: {
      units: {
        orderBy: { unitIndex: 'asc' },
      },
    },
    orderBy: [{ version: 'desc' }],
  });

  if (!activeBuild) {
    throw new Error('ACTIVE_INDEX_BUILD_NOT_FOUND');
  }

  return activeBuild.units.map((unit) => ({
    unitKey: unit.unitKey,
    content: unit.content,
    unitIndex: unit.unitIndex,
    tokenCount: unit.tokenCount,
  }));
}

function parseCheckpointPayload<T>(payloadJson: string): T | null {
  try {
    return JSON.parse(payloadJson) as T;
  } catch {
    return null;
  }
}

async function failJob(jobId: string, stage: string, errorMessage: string) {
  await prisma.ragHierarchicalIndexJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      stage,
      lastError: errorMessage,
      finishedAt: new Date(),
    },
  });
}

async function completeJob(jobId: string) {
  await prisma.ragHierarchicalIndexJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      stage: 'completed',
      lastError: null,
      finishedAt: new Date(),
    },
  });
}

export async function runHierarchicalIndexJob(
  input: RunHierarchicalIndexInput
): Promise<HierarchicalIndexRunResult> {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  let recoveredFromJobId: string | undefined;
  let resumeStage: HierarchicalStage | null = null;
  let rootClustersFromCheckpoint: RootCluster[] | null = null;
  let subClustersFromCheckpoint: SubCluster[] | null = null;
  let recoveredWithinSla: boolean | undefined;

  if (input.action === 'resume') {
    const failedJob = input.jobId
      ? await prisma.ragHierarchicalIndexJob.findUnique({
          where: { id: input.jobId },
        })
      : await prisma.ragHierarchicalIndexJob.findFirst({
          where: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            status: 'FAILED',
          },
          orderBy: [{ updatedAt: 'desc' }],
        });

    if (!failedJob) {
      throw new Error('FAILED_JOB_NOT_FOUND');
    }

    recoveredFromJobId = failedJob.id;
    const checkpoint = await prisma.ragIndexCheckpoint.findFirst({
      where: { jobId: failedJob.id },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (checkpoint) {
      if (checkpoint.stage === 'cluster-root') {
        resumeStage = 'cluster-sub';
        const payload = parseCheckpointPayload<{ rootClusters?: RootCluster[] }>(checkpoint.payloadJson);
        rootClustersFromCheckpoint = payload?.rootClusters || null;
      } else if (checkpoint.stage === 'cluster-sub') {
        resumeStage = 'finalize';
        const payload = parseCheckpointPayload<{
          rootClusters?: RootCluster[];
          subClusters?: SubCluster[];
        }>(checkpoint.payloadJson);
        rootClustersFromCheckpoint = payload?.rootClusters || null;
        subClustersFromCheckpoint = payload?.subClusters || null;
      } else {
        resumeStage = 'cluster-root';
      }
    } else {
      resumeStage = 'cluster-root';
    }

    recoveredWithinSla =
      Date.now() - new Date(failedJob.updatedAt).getTime() <= RECOVERY_WINDOW_MINUTES * 60 * 1000;
  }

  const job = await prisma.ragHierarchicalIndexJob.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      projectId: normalizedProjectId,
      status: 'RUNNING',
      stage: resumeStage || 'cluster-root',
      createdBy: input.actorId,
      recoveredFromJobId,
    },
  });

  const units = await loadActiveBuildUnits(input.sourceType, input.sourceId);
  const unitContentMap = buildUnitContentMap(units);

  let rootClusters = rootClustersFromCheckpoint || buildRootClusters(units);
  let subClusters = subClustersFromCheckpoint || buildSubClusters(rootClusters);
  let stage: HierarchicalStage = resumeStage || 'cluster-root';

  try {
    if (stage === 'cluster-sub') {
      await createRootNodes({
        jobId: job.id,
        rootClusters,
        unitContentMap,
      });
    } else if (stage === 'finalize') {
      await createRootNodes({
        jobId: job.id,
        rootClusters,
        unitContentMap,
      });
      await createSubNodes({
        jobId: job.id,
        subClusters,
        unitContentMap,
      });
    }

    if (stage === 'cluster-root') {
      await createCheckpoint({
        jobId: job.id,
        stage: 'cluster-root',
        cursor: rootClusters.length,
        payload: {
          rootClusters,
        },
      });

      if (input.simulateInterruptStage === 'cluster-root') {
        throw new Error('SIMULATED_INTERRUPT_CLUSTER_ROOT');
      }

      await createRootNodes({
        jobId: job.id,
        rootClusters,
        unitContentMap,
      });

      stage = 'cluster-sub';
      subClusters = buildSubClusters(rootClusters);
    }

    if (stage === 'cluster-sub') {
      await createCheckpoint({
        jobId: job.id,
        stage: 'cluster-sub',
        cursor: subClusters.length,
        payload: {
          rootClusters,
          subClusters,
        },
      });

      if (input.simulateInterruptStage === 'cluster-sub') {
        throw new Error('SIMULATED_INTERRUPT_CLUSTER_SUB');
      }

      await createSubNodes({
        jobId: job.id,
        subClusters,
        unitContentMap,
      });

      stage = 'finalize';
    }

    if (stage === 'finalize') {
      await createCheckpoint({
        jobId: job.id,
        stage: 'finalize',
        cursor: units.length,
        payload: {
          unitCount: units.length,
        },
      });

      const subNodes = await prisma.ragHierarchicalIndexNode.findMany({
        where: { jobId: job.id, level: 1 },
      });
      const subNodeByUnitKey = new Map<string, string>();
      for (const sub of subNodes) {
        const unitKeys = parseCheckpointPayload<string[]>(sub.unitRefsJson) || [];
        for (const unitKey of unitKeys) {
          subNodeByUnitKey.set(unitKey, sub.id);
        }
      }

      const leafRows = units.map((unit) => {
        const parentId = subNodeByUnitKey.get(unit.unitKey);
        if (!parentId) {
          throw new Error(`MISSING_SUB_NODE:${unit.unitKey}`);
        }
        return {
          jobId: job.id,
          parentId,
          level: 2,
          nodeKey: `${job.id}:leaf:${unit.unitKey}`,
          clusterKey: `leaf-${unit.unitIndex}`,
          summary: summarize(unit.content, 100),
          unitRefsJson: JSON.stringify([unit.unitKey]),
          metadata: JSON.stringify({ kind: 'leaf', tokenCount: unit.tokenCount }),
        };
      });

      if (leafRows.length > 0) {
        await prisma.ragHierarchicalIndexNode.createMany({
          data: leafRows,
        });
      }
    }

    await completeJob(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_INDEX_JOB_ERROR';
    await failJob(job.id, stage, message);
    const checkpointCount = await prisma.ragIndexCheckpoint.count({
      where: { jobId: job.id },
    });
    return {
      jobId: job.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: 'FAILED',
      stage,
      nodeCount: 0,
      checkpointCount,
      recoveredFromJobId,
      recoveredWithinSla,
      recoveryWindowMinutes: RECOVERY_WINDOW_MINUTES,
      error: message,
    };
  }

  const [nodeCount, checkpointCount] = await Promise.all([
    prisma.ragHierarchicalIndexNode.count({ where: { jobId: job.id } }),
    prisma.ragIndexCheckpoint.count({ where: { jobId: job.id } }),
  ]);

  return {
    jobId: job.id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: 'COMPLETED',
    stage: 'completed',
    nodeCount,
    checkpointCount,
    recoveredFromJobId,
    recoveredWithinSla,
    recoveryWindowMinutes: RECOVERY_WINDOW_MINUTES,
  };
}

export async function getHierarchicalIndexSnapshot(input: {
  sourceType: IndexSourceType;
  sourceId: string;
}) {
  const latestJob = await prisma.ragHierarchicalIndexJob.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  if (!latestJob) {
    return {
      latestJob: null,
      checkpoints: [],
      nodes: [],
    };
  }

  const [checkpoints, nodes] = await Promise.all([
    prisma.ragIndexCheckpoint.findMany({
      where: { jobId: latestJob.id },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.ragHierarchicalIndexNode.findMany({
      where: { jobId: latestJob.id },
      orderBy: [{ level: 'asc' }, { clusterKey: 'asc' }],
    }),
  ]);

  return {
    latestJob,
    checkpoints,
    nodes,
  };
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function overlapScore(query: string, text: string): number {
  const qTokens = new Set(tokenize(query));
  const tTokens = new Set(tokenize(text));
  if (qTokens.size === 0 || tTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of qTokens) {
    if (tTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / qTokens.size;
}

export function layeredRecallFromNodes(input: {
  query: string;
  nodes: Array<{
    id: string;
    level: number;
    summary: string;
    unitRefsJson: string;
  }>;
  topK?: number;
}) {
  const topK = Math.max(1, Math.min(input.topK || 8, 30));
  return input.nodes
    .map((node) => ({
      id: node.id,
      level: node.level,
      summary: node.summary,
      score: Number(overlapScore(input.query, node.summary).toFixed(4)),
      unitRefs: parseCheckpointPayload<string[]>(node.unitRefsJson) || [],
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.level - b.level;
    })
    .slice(0, topK);
}
