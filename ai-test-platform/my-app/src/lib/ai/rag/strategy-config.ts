import { prisma } from '@/lib/prisma';

export interface RagStrategyToggles {
  multiQuery: boolean;
  hyde: boolean;
  decomposition: boolean;
  fusion: boolean;
}

export interface RagStrategyResolution {
  id?: string;
  projectId?: string;
  version: number;
  source: 'default' | 'persisted' | 'persisted+request';
  toggles: RagStrategyToggles;
}

export const DEFAULT_RAG_STRATEGY_TOGGLES: RagStrategyToggles = {
  multiQuery: false,
  hyde: true,
  decomposition: false,
  fusion: false,
};

type StrategyOverrides = Partial<RagStrategyToggles>;

function hasAnyToggleOverride(overrides?: StrategyOverrides): boolean {
  if (!overrides) {
    return false;
  }
  return ['multiQuery', 'hyde', 'decomposition', 'fusion'].some((key) =>
    Object.prototype.hasOwnProperty.call(overrides, key)
  );
}

function mergeToggles(base: RagStrategyToggles, overrides?: StrategyOverrides): RagStrategyToggles {
  return {
    multiQuery: overrides?.multiQuery ?? base.multiQuery,
    hyde: overrides?.hyde ?? base.hyde,
    decomposition: overrides?.decomposition ?? base.decomposition,
    fusion: overrides?.fusion ?? base.fusion,
  };
}

function mapRecordToToggles(record: {
  multiQuery: boolean;
  hyde: boolean;
  decomposition: boolean;
  fusion: boolean;
}): RagStrategyToggles {
  return {
    multiQuery: record.multiQuery,
    hyde: record.hyde,
    decomposition: record.decomposition,
    fusion: record.fusion,
  };
}

function normalizeProjectId(projectId?: string): string | null {
  if (!projectId) {
    return null;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getLatestRagStrategyConfig(projectId?: string) {
  const normalizedProjectId = normalizeProjectId(projectId);

  return prisma.ragStrategyConfig.findFirst({
    where: {
      projectId: normalizedProjectId,
      isActive: true,
    },
    orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function resolveRagStrategyConfig(input: {
  projectId?: string;
  overrides?: StrategyOverrides;
}): Promise<RagStrategyResolution> {
  const persisted = await getLatestRagStrategyConfig(input.projectId);
  const baseToggles = persisted
    ? mapRecordToToggles(persisted)
    : DEFAULT_RAG_STRATEGY_TOGGLES;
  const toggles = mergeToggles(baseToggles, input.overrides);
  const hasRequestOverrides = hasAnyToggleOverride(input.overrides);

  return {
    id: persisted?.id,
    projectId: persisted?.projectId || undefined,
    version: persisted?.version ?? 0,
    source: persisted
      ? hasRequestOverrides
        ? 'persisted+request'
        : 'persisted'
      : 'default',
    toggles,
  };
}

export async function saveRagStrategyConfig(input: {
  actorId: string;
  projectId?: string;
  toggles: StrategyOverrides;
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const latest = await getLatestRagStrategyConfig(normalizedProjectId || undefined);
  const previousToggles = latest
    ? mapRecordToToggles(latest)
    : DEFAULT_RAG_STRATEGY_TOGGLES;
  const nextToggles = mergeToggles(previousToggles, input.toggles);
  const nextVersion = (latest?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    await tx.ragStrategyConfig.updateMany({
      where: {
        projectId: normalizedProjectId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return tx.ragStrategyConfig.create({
      data: {
        projectId: normalizedProjectId,
        multiQuery: nextToggles.multiQuery,
        hyde: nextToggles.hyde,
        decomposition: nextToggles.decomposition,
        fusion: nextToggles.fusion,
        version: nextVersion,
        isActive: true,
        updatedBy: input.actorId,
      },
    });
  });
}
