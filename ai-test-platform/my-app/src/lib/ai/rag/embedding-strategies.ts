import { prisma } from '@/lib/prisma';

export interface EmbeddingStrategyPlugin {
  name: string;
  dimension: number;
  generate: (texts: string[]) => Promise<number[][]>;
}

export interface EmbeddingGenerationResult {
  vectors: number[][];
  strategyNameUsed: string;
  configuredStrategyName: string;
  configVersion: number;
  dimension: number;
  fallbackApplied: boolean;
  fallbackReason?: string;
  source: 'default' | 'persisted' | 'persisted+request';
}

export interface EmbeddingStrategyConfigResolution {
  strategyName: string;
  dimension: number;
  fallbackTo: string;
  version: number;
  source: 'default' | 'persisted' | 'persisted+request';
}

type SaveConfigInput = {
  actorId: string;
  projectId?: string;
  strategyName: string;
  dimension: number;
  fallbackTo?: string;
};

function normalizeProjectId(projectId?: string): string | null {
  if (!projectId) {
    return null;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hashToken(token: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function generateDeterministicVector(text: string, dimension: number, salt = 0): number[] {
  const vector = new Array<number>(dimension).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const hash = hashToken(token, salt);
    const index = hash % dimension;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[index] += sign * ((hash % 1000) / 1000 + 0.2);
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm <= 0) {
    return vector;
  }

  return vector.map((value) => Number((value / norm).toFixed(8)));
}

const defaultHashPlugin: EmbeddingStrategyPlugin = {
  name: 'default-hash',
  dimension: 128,
  async generate(texts: string[]) {
    return texts.map((text) => generateDeterministicVector(text, 128, 11));
  },
};

const colbertLitePlugin: EmbeddingStrategyPlugin = {
  name: 'colbert-lite',
  dimension: 96,
  async generate(texts: string[]) {
    return texts.map((text) => generateDeterministicVector(text, 96, 29));
  },
};

const highRecallPlugin: EmbeddingStrategyPlugin = {
  name: 'high-recall',
  dimension: 256,
  async generate(texts: string[]) {
    return texts.map((text) => generateDeterministicVector(text, 256, 47));
  },
};

const STRATEGY_REGISTRY = new Map<string, EmbeddingStrategyPlugin>([
  [defaultHashPlugin.name, defaultHashPlugin],
  [colbertLitePlugin.name, colbertLitePlugin],
  [highRecallPlugin.name, highRecallPlugin],
]);

export function listAvailableEmbeddingStrategies() {
  return Array.from(STRATEGY_REGISTRY.values()).map((item) => ({
    name: item.name,
    dimension: item.dimension,
  }));
}

function getStrategyPlugin(name: string): EmbeddingStrategyPlugin | null {
  return STRATEGY_REGISTRY.get(name) || null;
}

export async function getLatestEmbeddingStrategyConfig(projectId?: string) {
  const normalizedProjectId = normalizeProjectId(projectId);
  return prisma.ragEmbeddingStrategyConfig.findFirst({
    where: {
      projectId: normalizedProjectId,
      isActive: true,
    },
    orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function resolveEmbeddingStrategyConfig(input: {
  projectId?: string;
  requestedStrategyName?: string;
}): Promise<EmbeddingStrategyConfigResolution> {
  const persisted = await getLatestEmbeddingStrategyConfig(input.projectId);
  const fallbackTo = persisted?.fallbackTo || defaultHashPlugin.name;

  if (input.requestedStrategyName) {
    const requestedPlugin = getStrategyPlugin(input.requestedStrategyName);
    if (requestedPlugin) {
      return {
        strategyName: requestedPlugin.name,
        dimension: requestedPlugin.dimension,
        fallbackTo,
        version: persisted?.version ?? 0,
        source: persisted ? 'persisted+request' : 'default',
      };
    }
  }

  if (persisted) {
    return {
      strategyName: persisted.strategyName,
      dimension: persisted.dimension,
      fallbackTo,
      version: persisted.version,
      source: 'persisted',
    };
  }

  return {
    strategyName: defaultHashPlugin.name,
    dimension: defaultHashPlugin.dimension,
    fallbackTo: defaultHashPlugin.name,
    version: 0,
    source: 'default',
  };
}

function validateDimension(vectors: number[][], expectedDimension: number): boolean {
  return vectors.every((vector) => vector.length === expectedDimension);
}

export async function generateEmbeddingsWithStrategy(input: {
  texts: string[];
  projectId?: string;
  requestedStrategyName?: string;
}): Promise<EmbeddingGenerationResult> {
  const resolved = await resolveEmbeddingStrategyConfig({
    projectId: input.projectId,
    requestedStrategyName: input.requestedStrategyName,
  });

  const primaryPlugin = getStrategyPlugin(resolved.strategyName);
  const fallbackPlugin = getStrategyPlugin(resolved.fallbackTo) || defaultHashPlugin;

  let pluginToUse = primaryPlugin || fallbackPlugin;
  let fallbackApplied = false;
  let fallbackReason: string | undefined;

  if (!primaryPlugin) {
    fallbackApplied = true;
    fallbackReason = `Strategy "${resolved.strategyName}" is unavailable.`;
  }

  let vectors = await pluginToUse.generate(input.texts);

  if (!validateDimension(vectors, resolved.dimension)) {
    pluginToUse = fallbackPlugin;
    vectors = await pluginToUse.generate(input.texts);
    fallbackApplied = true;
    fallbackReason = `Dimension mismatch for strategy "${resolved.strategyName}".`;
  }

  if (!validateDimension(vectors, pluginToUse.dimension)) {
    throw new Error(`Embedding generation failed for strategy "${pluginToUse.name}".`);
  }

  return {
    vectors,
    strategyNameUsed: pluginToUse.name,
    configuredStrategyName: resolved.strategyName,
    configVersion: resolved.version,
    dimension: pluginToUse.dimension,
    fallbackApplied,
    fallbackReason,
    source: resolved.source,
  };
}

export async function saveEmbeddingStrategyConfig(input: SaveConfigInput) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const strategyPlugin = getStrategyPlugin(input.strategyName);
  if (!strategyPlugin) {
    throw new Error(`Unknown embedding strategy: ${input.strategyName}`);
  }
  if (input.dimension !== strategyPlugin.dimension) {
    throw new Error(
      `Dimension mismatch for strategy "${strategyPlugin.name}": expected ${strategyPlugin.dimension}, got ${input.dimension}`
    );
  }
  const fallbackPlugin = getStrategyPlugin(input.fallbackTo || defaultHashPlugin.name);
  if (!fallbackPlugin) {
    throw new Error(`Unknown fallback strategy: ${input.fallbackTo}`);
  }

  const latest = await getLatestEmbeddingStrategyConfig(normalizedProjectId || undefined);
  const nextVersion = (latest?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    await tx.ragEmbeddingStrategyConfig.updateMany({
      where: {
        projectId: normalizedProjectId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return tx.ragEmbeddingStrategyConfig.create({
      data: {
        projectId: normalizedProjectId,
        strategyName: strategyPlugin.name,
        dimension: strategyPlugin.dimension,
        fallbackTo: fallbackPlugin.name,
        version: nextVersion,
        isActive: true,
        updatedBy: input.actorId,
      },
    });
  });
}
