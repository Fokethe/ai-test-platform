import { prisma } from '@/lib/prisma';
import { DocumentProcessor, DocumentProcessResult } from '@/lib/ai/rag/document-processor';

export type IndexSourceType = 'KNOWLEDGE_ENTRY' | 'AI_REQUIREMENT';

export interface IndexBuildOptions {
  targetChunkSize?: number;
  minChunkSize?: number;
  overlapSentences?: number;
  maxChunks?: number;
}

export interface IndexSourceRecord {
  sourceType: IndexSourceType;
  sourceId: string;
  projectId?: string;
  title: string;
  content: string;
}

function toPrismaSourceType(sourceType: IndexSourceType) {
  return sourceType;
}

async function loadKnowledgeEntry(sourceId: string): Promise<IndexSourceRecord | null> {
  const entry = await prisma.knowledgeEntry.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      content: true,
      projectId: true,
    },
  });

  if (!entry) {
    return null;
  }

  return {
    sourceType: 'KNOWLEDGE_ENTRY',
    sourceId: entry.id,
    projectId: entry.projectId || undefined,
    title: entry.title,
    content: entry.content,
  };
}

async function loadAiRequirement(sourceId: string): Promise<IndexSourceRecord | null> {
  const requirement = await prisma.aiRequirement.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      content: true,
      projectId: true,
    },
  });

  if (!requirement) {
    return null;
  }

  return {
    sourceType: 'AI_REQUIREMENT',
    sourceId: requirement.id,
    projectId: requirement.projectId,
    title: requirement.title,
    content: requirement.content,
  };
}

export async function loadIndexSource(
  sourceType: IndexSourceType,
  sourceId: string
): Promise<IndexSourceRecord | null> {
  if (sourceType === 'KNOWLEDGE_ENTRY') {
    return loadKnowledgeEntry(sourceId);
  }
  return loadAiRequirement(sourceId);
}

function toStrategyJson(options: IndexBuildOptions): string {
  return JSON.stringify({
    targetChunkSize: options.targetChunkSize,
    minChunkSize: options.minChunkSize,
    overlapSentences: options.overlapSentences,
    maxChunks: options.maxChunks,
  });
}

function mapProcessResultToUnitRows(input: {
  sourceType: IndexSourceType;
  sourceId: string;
  version: number;
  processResult: DocumentProcessResult;
  buildId: string;
}) {
  return input.processResult.units.map((unit) => ({
    buildId: input.buildId,
    unitKey: `${input.sourceType}:${input.sourceId}:v${input.version}:u${unit.index}`,
    unitIndex: unit.index,
    content: unit.content,
    tokenCount: unit.tokenCount,
    startOffset: unit.startOffset,
    endOffset: unit.endOffset,
    metadata: JSON.stringify({
      sentenceCount: unit.sentenceCount,
      qualityScore: input.processResult.qualityScore,
    }),
  }));
}

export async function buildSemanticIndexUnits(input: {
  actorId: string;
  source: IndexSourceRecord;
  options?: IndexBuildOptions;
}) {
  const processor = new DocumentProcessor();
  const processResult = await processor.process(input.source.content, input.options || {});

  const latestBuild = await prisma.ragIndexBuild.findFirst({
    where: {
      sourceType: toPrismaSourceType(input.source.sourceType),
      sourceId: input.source.sourceId,
    },
    orderBy: [{ version: 'desc' }],
  });
  const nextVersion = (latestBuild?.version ?? 0) + 1;

  const build = await prisma.$transaction(async (tx) => {
    await tx.ragIndexBuild.updateMany({
      where: {
        sourceType: toPrismaSourceType(input.source.sourceType),
        sourceId: input.source.sourceId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const createdBuild = await tx.ragIndexBuild.create({
      data: {
        sourceType: toPrismaSourceType(input.source.sourceType),
        sourceId: input.source.sourceId,
        projectId: input.source.projectId,
        version: nextVersion,
        isActive: true,
        strategyJson: toStrategyJson(input.options || {}),
        qualityScore: processResult.qualityScore,
        unitCount: processResult.units.length,
        createdBy: input.actorId,
      },
    });

    const unitRows = mapProcessResultToUnitRows({
      sourceType: input.source.sourceType,
      sourceId: input.source.sourceId,
      version: nextVersion,
      processResult,
      buildId: createdBuild.id,
    });

    if (unitRows.length > 0) {
      await tx.ragIndexUnit.createMany({
        data: unitRows,
      });
    }

    return createdBuild;
  });

  return {
    build,
    processResult,
    source: input.source,
  };
}

export async function getActiveIndexBuild(input: {
  sourceType: IndexSourceType;
  sourceId: string;
}) {
  return prisma.ragIndexBuild.findFirst({
    where: {
      sourceType: toPrismaSourceType(input.sourceType),
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
}

export async function listIndexBuildVersions(input: {
  sourceType: IndexSourceType;
  sourceId: string;
}) {
  return prisma.ragIndexBuild.findMany({
    where: {
      sourceType: toPrismaSourceType(input.sourceType),
      sourceId: input.sourceId,
    },
    select: {
      id: true,
      version: true,
      isActive: true,
      qualityScore: true,
      unitCount: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ version: 'desc' }],
    take: 20,
  });
}
