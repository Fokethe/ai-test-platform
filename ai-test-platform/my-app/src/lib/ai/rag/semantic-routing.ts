import { prisma } from '@/lib/prisma';

export interface PromptTemplateRecord {
  id: string;
  projectId?: string;
  scenario: string;
  name: string;
  template: string;
  keywords: string[];
  version: number;
}

export interface SemanticRoutingSelection {
  templateId?: string;
  scenario: string;
  name: string;
  version: number;
  confidence: number;
  reason: string;
  appliedPrompt: string;
}

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
    .replace(/[^\w\u4e00-\u9fa5]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeywords(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function buildAppliedPrompt(template: string, query: string): string {
  if (template.includes('{{query}}')) {
    return template.replaceAll('{{query}}', query);
  }
  return `${template}\n\nQuestion: ${query}`;
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(setA.size, 1);
}

export async function getActivePromptTemplates(projectId?: string) {
  const normalizedProjectId = normalizeProjectId(projectId);
  const templates = await prisma.ragPromptTemplateVersion.findMany({
    where: {
      projectId: normalizedProjectId,
      isActive: true,
    },
    orderBy: [{ scenario: 'asc' }, { version: 'desc' }],
  });

  return templates.map((item) => ({
    id: item.id,
    projectId: item.projectId || undefined,
    scenario: item.scenario,
    name: item.name,
    template: item.template,
    keywords: parseKeywords(item.keywords),
    version: item.version,
  }));
}

export async function listPromptTemplateVersions(input: {
  projectId?: string;
  scenario?: string;
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  return prisma.ragPromptTemplateVersion.findMany({
    where: {
      projectId: normalizedProjectId,
      ...(input.scenario ? { scenario: input.scenario } : {}),
    },
    select: {
      id: true,
      projectId: true,
      scenario: true,
      name: true,
      version: true,
      isActive: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ scenario: 'asc' }, { version: 'desc' }],
    take: 50,
  });
}

export async function savePromptTemplateVersion(input: {
  actorId: string;
  projectId?: string;
  scenario: string;
  name: string;
  template: string;
  keywords: string[];
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const normalizedScenario = input.scenario.trim().toLowerCase();
  const existing = await prisma.ragPromptTemplateVersion.findFirst({
    where: {
      projectId: normalizedProjectId,
      scenario: normalizedScenario,
    },
    orderBy: [{ version: 'desc' }],
  });
  const nextVersion = (existing?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    await tx.ragPromptTemplateVersion.updateMany({
      where: {
        projectId: normalizedProjectId,
        scenario: normalizedScenario,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return tx.ragPromptTemplateVersion.create({
      data: {
        projectId: normalizedProjectId,
        scenario: normalizedScenario,
        name: input.name,
        template: input.template,
        keywords: JSON.stringify(input.keywords),
        version: nextVersion,
        isActive: true,
        updatedBy: input.actorId,
      },
    });
  });
}

export async function rollbackPromptTemplateVersion(input: {
  actorId: string;
  projectId?: string;
  scenario: string;
  rollbackToVersion: number;
}) {
  const normalizedProjectId = normalizeProjectId(input.projectId);
  const normalizedScenario = input.scenario.trim().toLowerCase();
  const target = await prisma.ragPromptTemplateVersion.findFirst({
    where: {
      projectId: normalizedProjectId,
      scenario: normalizedScenario,
      version: input.rollbackToVersion,
    },
  });

  if (!target) {
    return null;
  }

  const saved = await savePromptTemplateVersion({
    actorId: input.actorId,
    projectId: normalizedProjectId || undefined,
    scenario: normalizedScenario,
    name: target.name,
    template: target.template,
    keywords: parseKeywords(target.keywords),
  });

  return {
    saved,
    rollbackFromVersion: target.version,
  };
}

export function selectPromptTemplate(input: {
  query: string;
  templates: PromptTemplateRecord[];
}): SemanticRoutingSelection {
  if (input.templates.length === 0) {
    return {
      scenario: 'default',
      name: 'system-default',
      version: 0,
      confidence: 0,
      reason: 'No active template found. Fallback to default prompt.',
      appliedPrompt: buildAppliedPrompt('Answer the question carefully.\n{{query}}', input.query),
    };
  }

  const queryTokens = tokenize(input.query);
  const scored = input.templates.map((template) => {
    const keywordTokens = tokenize(template.keywords.join(' '));
    const scenarioTokens = tokenize(template.scenario);
    const keywordScore = overlapRatio(queryTokens, keywordTokens);
    const scenarioScore = overlapRatio(queryTokens, scenarioTokens);
    const fallbackBoost = template.scenario === 'default' ? 0.05 : 0;
    const score = Math.min(keywordScore * 0.8 + scenarioScore * 0.2 + fallbackBoost, 1);

    return {
      template,
      score,
      keywordScore,
      scenarioScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    templateId: best.template.id,
    scenario: best.template.scenario,
    name: best.template.name,
    version: best.template.version,
    confidence: Number(best.score.toFixed(4)),
    reason: `Selected by semantic overlap (keywords=${best.keywordScore.toFixed(
      2
    )}, scenario=${best.scenarioScore.toFixed(2)})`,
    appliedPrompt: buildAppliedPrompt(best.template.template, input.query),
  };
}
