import { QuerySource } from '@/lib/ai/rag/multi-source-query';
import { prisma } from '@/lib/prisma';

export const DEFAULT_ROUTING_SOURCES: QuerySource[] = ['relational', 'graph', 'vector'];

export type RoutingOperator = 'contains' | 'equals' | 'startsWith' | 'regex';
export type RoutingField = 'query' | 'departmentId' | 'projectId';
export type RoutingMode = 'ALL' | 'ANY';

export interface RoutingCondition {
  field: RoutingField;
  operator: RoutingOperator;
  value: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  mode: RoutingMode;
  conditions: RoutingCondition[];
  targetSources: QuerySource[];
  note?: string;
}

export interface RoutingDecision {
  selectedSources: QuerySource[];
  matchedRule?: {
    id: string;
    name: string;
    priority: number;
    targetSources: QuerySource[];
  };
  reason: string;
}

function normalizeProjectId(projectId?: string): string | null {
  if (!projectId) {
    return null;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidSource(value: string): value is QuerySource {
  return value === 'relational' || value === 'graph' || value === 'vector';
}

function normalizeRule(rule: Partial<RoutingRule>, index: number): RoutingRule | null {
  const id = typeof rule.id === 'string' && rule.id.trim().length > 0 ? rule.id : `rule-${index + 1}`;
  const name =
    typeof rule.name === 'string' && rule.name.trim().length > 0
      ? rule.name
      : `Routing Rule ${index + 1}`;
  const priority = typeof rule.priority === 'number' ? rule.priority : 0;
  const enabled = rule.enabled !== false;
  const mode = rule.mode === 'ANY' ? 'ANY' : 'ALL';
  const conditions = Array.isArray(rule.conditions)
    ? rule.conditions
        .map((condition) => ({
          field: condition.field,
          operator: condition.operator,
          value: typeof condition.value === 'string' ? condition.value : '',
        }))
        .filter(
          (condition): condition is RoutingCondition =>
            (condition.field === 'query' ||
              condition.field === 'departmentId' ||
              condition.field === 'projectId') &&
            (condition.operator === 'contains' ||
              condition.operator === 'equals' ||
              condition.operator === 'startsWith' ||
              condition.operator === 'regex') &&
            condition.value.trim().length > 0
        )
    : [];

  const targetSources = Array.isArray(rule.targetSources)
    ? rule.targetSources.filter((source): source is QuerySource => isValidSource(source))
    : [];
  const finalSources = targetSources.length > 0 ? targetSources : DEFAULT_ROUTING_SOURCES;

  return {
    id,
    name,
    priority,
    enabled,
    mode,
    conditions,
    targetSources: Array.from(new Set(finalSources)),
    note: typeof rule.note === 'string' ? rule.note : undefined,
  };
}

export function parseRoutingRules(value: unknown): RoutingRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) =>
      typeof item === 'object' && item !== null
        ? normalizeRule(item as Partial<RoutingRule>, index)
        : null
    )
    .filter((item): item is RoutingRule => !!item);
}

function evaluateCondition(fieldValue: string, condition: RoutingCondition): boolean {
  const source = fieldValue.toLowerCase();
  const target = condition.value.toLowerCase();

  if (condition.operator === 'contains') {
    return source.includes(target);
  }

  if (condition.operator === 'equals') {
    return source === target;
  }

  if (condition.operator === 'startsWith') {
    return source.startsWith(target);
  }

  try {
    const regex = new RegExp(condition.value, 'i');
    return regex.test(fieldValue);
  } catch {
    return false;
  }
}

function matchRule(
  rule: RoutingRule,
  context: { query: string; departmentId: string; projectId?: string }
): boolean {
  if (!rule.enabled) {
    return false;
  }
  if (rule.conditions.length === 0) {
    return true;
  }

  const values: Record<RoutingField, string> = {
    query: context.query,
    departmentId: context.departmentId,
    projectId: context.projectId || '',
  };

  const results = rule.conditions.map((condition) =>
    evaluateCondition(values[condition.field], condition)
  );

  if (rule.mode === 'ANY') {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}

export function evaluateRoutingRules(input: {
  rules: RoutingRule[];
  context: { query: string; departmentId: string; projectId?: string };
}): RoutingDecision {
  const sortedRules = [...input.rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (!matchRule(rule, input.context)) {
      continue;
    }

    return {
      selectedSources: rule.targetSources,
      matchedRule: {
        id: rule.id,
        name: rule.name,
        priority: rule.priority,
        targetSources: rule.targetSources,
      },
      reason: `Matched rule "${rule.name}" (priority: ${rule.priority})`,
    };
  }

  return {
    selectedSources: DEFAULT_ROUTING_SOURCES,
    reason: 'No routing rule matched. Use default source path.',
  };
}

export async function getLatestRoutingRuleSet(projectId?: string) {
  const normalizedProjectId = normalizeProjectId(projectId);
  return prisma.ragRoutingRuleSet.findFirst({
    where: {
      projectId: normalizedProjectId,
      isActive: true,
    },
    orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function listRoutingRuleVersions(projectId?: string) {
  const normalizedProjectId = normalizeProjectId(projectId);
  return prisma.ragRoutingRuleSet.findMany({
    where: {
      projectId: normalizedProjectId,
    },
    select: {
      id: true,
      version: true,
      isActive: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ version: 'desc' }],
    take: 20,
  });
}

export async function saveRoutingRuleSet(input: {
  actorId: string;
  projectId?: string;
  rules: RoutingRule[];
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const latest = await getLatestRoutingRuleSet(normalizedProjectId || undefined);
  const nextVersion = (latest?.version ?? 0) + 1;
  const rulesJson = JSON.stringify(input.rules);

  return prisma.$transaction(async (tx) => {
    await tx.ragRoutingRuleSet.updateMany({
      where: {
        projectId: normalizedProjectId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return tx.ragRoutingRuleSet.create({
      data: {
        projectId: normalizedProjectId,
        version: nextVersion,
        isActive: true,
        rulesJson,
        updatedBy: input.actorId,
      },
    });
  });
}

export async function rollbackRoutingRuleSet(input: {
  actorId: string;
  projectId?: string;
  rollbackToVersion: number;
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const target = await prisma.ragRoutingRuleSet.findFirst({
    where: {
      projectId: normalizedProjectId,
      version: input.rollbackToVersion,
    },
  });

  if (!target) {
    return null;
  }

  const rules = parseRoutingRules(JSON.parse(target.rulesJson));
  const saved = await saveRoutingRuleSet({
    actorId: input.actorId,
    projectId: normalizedProjectId || undefined,
    rules,
  });

  return {
    saved,
    rollbackFromVersion: target.version,
  };
}
