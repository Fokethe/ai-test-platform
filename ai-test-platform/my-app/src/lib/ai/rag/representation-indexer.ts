import { prisma } from '@/lib/prisma';
import {
  generateEmbeddingsWithStrategy,
  EmbeddingGenerationResult,
} from '@/lib/ai/rag/embedding-strategies';
import { IndexSourceType } from '@/lib/ai/rag/index-unit-builder';

type RepresentationType = 'ORIGINAL' | 'SUMMARY';

export interface BuildRepresentationInput {
  actorId: string;
  sourceType: IndexSourceType;
  sourceId: string;
  projectId?: string;
  summaryMaxChars?: number;
  requestedStrategyName?: string;
  simulateFailureAt?: 'vector' | 'graph' | 'none';
}

export interface RepresentationBuildResult {
  buildId: string;
  sourceType: IndexSourceType;
  sourceId: string;
  projectId?: string;
  representationCount: number;
  summaryCount: number;
  vectorWriteCount: number;
  graphWriteCount: number;
  compensationApplied: boolean;
  failedStage?: 'vector' | 'graph';
  error?: string;
  embedding: Pick<
    EmbeddingGenerationResult,
    'strategyNameUsed' | 'configuredStrategyName' | 'configVersion' | 'dimension' | 'fallbackApplied' | 'fallbackReason' | 'source'
  >;
}

interface RepresentationRecord {
  sourceUnitKey: string;
  representationType: RepresentationType;
  content: string;
  summary?: string;
  title: string;
  metadata: Record<string, unknown>;
}

function summarize(content: string, maxChars: number): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const sentenceBoundary = normalized.search(/[.?!。！？；;]/);
  void sentenceBoundary;
  const normalizedSentenceBoundary = normalized.search(/[.?!\u3002\uFF1F\uFF01\uFF1B;]/);
  if (normalizedSentenceBoundary > 30 && normalizedSentenceBoundary < maxChars) {
    return normalized.slice(0, normalizedSentenceBoundary + 1);
  }

  return `${normalized.slice(0, maxChars)}...`;
}

function toVectorKey(input: {
  sourceType: IndexSourceType;
  sourceId: string;
  buildVersion: number;
  sourceUnitKey: string;
  representationType: RepresentationType;
}): string {
  return `${input.sourceType}:${input.sourceId}:v${input.buildVersion}:${input.sourceUnitKey}:${input.representationType}:vector`;
}

function toNodeKey(input: {
  sourceType: IndexSourceType;
  sourceId: string;
  buildVersion: number;
  sourceUnitKey: string;
  representationType: RepresentationType;
}): string {
  return `${input.sourceType}:${input.sourceId}:v${input.buildVersion}:${input.sourceUnitKey}:${input.representationType}:graph`;
}

function buildRepresentationRecords(input: {
  sourceType: IndexSourceType;
  sourceId: string;
  units: Array<{
    unitKey: string;
    content: string;
    tokenCount: number;
    unitIndex: number;
  }>;
  summaryMaxChars: number;
}): RepresentationRecord[] {
  const records: RepresentationRecord[] = [];

  for (const unit of input.units) {
    const summary = summarize(unit.content, input.summaryMaxChars);
    records.push({
      sourceUnitKey: unit.unitKey,
      representationType: 'ORIGINAL',
      content: unit.content,
      summary,
      title: `${input.sourceType} original ${unit.unitIndex}`,
      metadata: {
        unitIndex: unit.unitIndex,
        tokenCount: unit.tokenCount,
      },
    });
    records.push({
      sourceUnitKey: unit.unitKey,
      representationType: 'SUMMARY',
      content: summary,
      summary,
      title: `${input.sourceType} summary ${unit.unitIndex}`,
      metadata: {
        unitIndex: unit.unitIndex,
        tokenCount: unit.tokenCount,
        derivedFrom: 'ORIGINAL',
      },
    });
  }

  return records;
}

async function deleteCreatedEntries(input: {
  vectorIds: string[];
  graphIds: string[];
}) {
  await Promise.all([
    input.vectorIds.length > 0
      ? prisma.ragVectorIndexEntry.deleteMany({ where: { id: { in: input.vectorIds } } })
      : Promise.resolve(),
    input.graphIds.length > 0
      ? prisma.ragGraphIndexNode.deleteMany({ where: { id: { in: input.graphIds } } })
      : Promise.resolve(),
  ]);
}

export async function buildMultiRepresentationIndex(
  input: BuildRepresentationInput
): Promise<RepresentationBuildResult> {
  const activeBuild = await prisma.ragIndexBuild.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
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

  const summaryMaxChars = Math.min(Math.max(input.summaryMaxChars ?? 220, 60), 1000);
  const records = buildRepresentationRecords({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    units: activeBuild.units.map((unit) => ({
      unitKey: unit.unitKey,
      content: unit.content,
      tokenCount: unit.tokenCount,
      unitIndex: unit.unitIndex,
    })),
    summaryMaxChars,
  });
  const summaryRecords = records.filter((item) => item.representationType === 'SUMMARY');

  const embedding = await generateEmbeddingsWithStrategy({
    texts: records.map((item) => item.content),
    projectId: input.projectId || activeBuild.projectId || undefined,
    requestedStrategyName: input.requestedStrategyName,
  });

  const createdVectorIds: string[] = [];
  const createdGraphIds: string[] = [];
  let failedStage: 'vector' | 'graph' | undefined;
  let failureMessage: string | undefined;
  let currentWriteStage: 'vector' | 'graph' = 'vector';

  try {
    currentWriteStage = 'vector';
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      const created = await prisma.ragVectorIndexEntry.create({
        data: {
          buildId: activeBuild.id,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceUnitKey: record.sourceUnitKey,
          representationType: record.representationType,
          vectorKey: toVectorKey({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            buildVersion: activeBuild.version,
            sourceUnitKey: record.sourceUnitKey,
            representationType: record.representationType,
          }),
          embeddingDim: embedding.dimension,
          strategyName: embedding.strategyNameUsed,
          content: record.content,
          summary: record.summary,
          metadata: JSON.stringify({
            ...record.metadata,
            embeddingVector: embedding.vectors[i],
            configVersion: embedding.configVersion,
          }),
          projectId: input.projectId || activeBuild.projectId,
        },
      });
      createdVectorIds.push(created.id);
    }

    if (input.simulateFailureAt === 'vector') {
      throw new Error('SIMULATED_VECTOR_WRITE_FAILURE');
    }

    currentWriteStage = 'graph';
    for (const record of summaryRecords) {
      const created = await prisma.ragGraphIndexNode.create({
        data: {
          buildId: activeBuild.id,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceUnitKey: record.sourceUnitKey,
          representationType: record.representationType,
          nodeKey: toNodeKey({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            buildVersion: activeBuild.version,
            sourceUnitKey: record.sourceUnitKey,
            representationType: record.representationType,
          }),
          title: record.title,
          content: record.content,
          summary: record.summary,
          linksJson: JSON.stringify({
            sourceUnitKey: record.sourceUnitKey,
            buildId: activeBuild.id,
          }),
          metadata: JSON.stringify(record.metadata),
          projectId: input.projectId || activeBuild.projectId,
        },
      });
      createdGraphIds.push(created.id);
    }

    if (input.simulateFailureAt === 'graph') {
      throw new Error('SIMULATED_GRAPH_WRITE_FAILURE');
    }
  } catch (error) {
    failedStage = currentWriteStage;
    failureMessage = error instanceof Error ? error.message : 'UNKNOWN_REPRESENTATION_WRITE_ERROR';
    await deleteCreatedEntries({
      vectorIds: createdVectorIds,
      graphIds: createdGraphIds,
    });
  }

  if (failureMessage) {
    return {
      buildId: activeBuild.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      projectId: input.projectId || activeBuild.projectId || undefined,
      representationCount: records.length,
      summaryCount: summaryRecords.length,
      vectorWriteCount: 0,
      graphWriteCount: 0,
      compensationApplied: true,
      failedStage,
      error: failureMessage,
      embedding: {
        strategyNameUsed: embedding.strategyNameUsed,
        configuredStrategyName: embedding.configuredStrategyName,
        configVersion: embedding.configVersion,
        dimension: embedding.dimension,
        fallbackApplied: embedding.fallbackApplied,
        fallbackReason: embedding.fallbackReason,
        source: embedding.source,
      },
    };
  }

  return {
    buildId: activeBuild.id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    projectId: input.projectId || activeBuild.projectId || undefined,
    representationCount: records.length,
    summaryCount: summaryRecords.length,
    vectorWriteCount: createdVectorIds.length,
    graphWriteCount: createdGraphIds.length,
    compensationApplied: false,
    embedding: {
      strategyNameUsed: embedding.strategyNameUsed,
      configuredStrategyName: embedding.configuredStrategyName,
      configVersion: embedding.configVersion,
      dimension: embedding.dimension,
      fallbackApplied: embedding.fallbackApplied,
      fallbackReason: embedding.fallbackReason,
      source: embedding.source,
    },
  };
}

export async function getRepresentationSnapshot(input: {
  sourceType: IndexSourceType;
  sourceId: string;
}) {
  const activeBuild = await prisma.ragIndexBuild.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      isActive: true,
    },
    orderBy: [{ version: 'desc' }],
  });

  if (!activeBuild) {
    return {
      activeBuild: null,
      vectorEntries: [],
      graphNodes: [],
    };
  }

  const [vectorEntries, graphNodes] = await Promise.all([
    prisma.ragVectorIndexEntry.findMany({
      where: { buildId: activeBuild.id },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    }),
    prisma.ragGraphIndexNode.findMany({
      where: { buildId: activeBuild.id },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    }),
  ]);

  return {
    activeBuild,
    vectorEntries,
    graphNodes,
  };
}
