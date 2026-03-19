import { prisma } from '@/lib/prisma';

export type QuerySource = 'relational' | 'graph' | 'vector';

export interface QueryPlan {
  source: QuerySource;
  statement: string;
  params: Record<string, unknown>;
}

export interface QueryCandidate {
  id: string;
  title: string;
  snippet: string;
  score: number;
  source: QuerySource;
  metadata?: Record<string, unknown>;
}

export interface SourceExecutionResult {
  source: QuerySource;
  success: boolean;
  plan: QueryPlan;
  items: QueryCandidate[];
  error?: string;
  latencyMs: number;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calcOverlapScore(query: string, text: string): number {
  const q = new Set(tokenize(query));
  const t = new Set(tokenize(text));
  if (q.size === 0 || t.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of q) {
    if (t.has(token)) {
      overlap += 1;
    }
  }

  return overlap / q.size;
}

function toSnippet(content: string, maxLength = 180): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export function buildQueryPlans(query: string, projectIds: string[]): QueryPlan[] {
  return [
    {
      source: 'relational',
      statement:
        'SELECT * FROM tests/requirements WHERE project_id IN (...) AND (title/name/description CONTAINS query)',
      params: { query, projectIds },
    },
    {
      source: 'graph',
      statement:
        'MATCH (project)-[:HAS_SYSTEM]->(system)-[:HAS_PAGE]->(page)-[:HAS_REQUIREMENT]->(requirement)-[:HAS_TEST]->(test) WHERE text CONTAINS query RETURN subgraph',
      params: { query, projectIds },
    },
    {
      source: 'vector',
      statement:
        'EMBED(query) -> similarity_search(knowledge_entries + ai_requirements) within project scope',
      params: { query, projectIds },
    },
  ];
}

async function executeRelational(
  query: string,
  projectIds: string[],
  limit: number
): Promise<QueryCandidate[]> {
  const [tests, requirements] = await Promise.all([
    prisma.test.findMany({
      where: {
        projectId: { in: projectIds },
        status: { not: 'ARCHIVED' },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    }),
    prisma.requirement.findMany({
      where: {
        page: { system: { projectId: { in: projectIds } } },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
      },
    }),
  ]);

  const testCandidates: QueryCandidate[] = tests.map((item) => {
    const text = `${item.name} ${item.description || ''}`;
    return {
      id: `test:${item.id}`,
      title: item.name,
      snippet: toSnippet(item.description || item.name),
      score: calcOverlapScore(query, text) * 0.8 + 0.2,
      source: 'relational',
      metadata: {
        entity: 'test',
        updatedAt: item.updatedAt,
      },
    };
  });

  const requirementCandidates: QueryCandidate[] = requirements.map((item) => {
    const text = `${item.title} ${item.description || ''}`;
    return {
      id: `requirement:${item.id}`,
      title: item.title,
      snippet: toSnippet(item.description || item.title),
      score: calcOverlapScore(query, text) * 0.75 + 0.25,
      source: 'relational',
      metadata: {
        entity: 'requirement',
        updatedAt: item.updatedAt,
      },
    };
  });

  return [...testCandidates, ...requirementCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function executeGraph(
  query: string,
  projectIds: string[],
  limit: number
): Promise<QueryCandidate[]> {
  const nodes = await prisma.requirement.findMany({
    where: {
      page: { system: { projectId: { in: projectIds } } },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    include: {
      page: {
        select: {
          id: true,
          name: true,
          system: {
            select: {
              id: true,
              name: true,
              projectId: true,
            },
          },
        },
      },
      tests: {
        take: 3,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return nodes.map((item) => {
    const pathText = `${item.page.system.name} ${item.page.name} ${item.title} ${
      item.description || ''
    } ${item.tests.map((test) => test.name).join(' ')}`;
    return {
      id: `graph:requirement:${item.id}`,
      title: item.title,
      snippet: toSnippet(
        `${item.page.system.name} > ${item.page.name} | related tests: ${
          item.tests.map((test) => test.name).join(', ') || 'none'
        }`
      ),
      score: calcOverlapScore(query, pathText) * 0.7 + 0.3,
      source: 'graph',
      metadata: {
        systemId: item.page.system.id,
        pageId: item.page.id,
        projectId: item.page.system.projectId,
        relatedTestCount: item.tests.length,
      },
    };
  });
}

async function executeVector(
  query: string,
  projectIds: string[],
  limit: number
): Promise<QueryCandidate[]> {
  const [knowledgeEntries, aiRequirements] = await Promise.all([
    prisma.knowledgeEntry.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        updatedAt: true,
      },
    }),
    prisma.aiRequirement.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
      },
    }),
  ]);

  const knowledgeCandidates: QueryCandidate[] = knowledgeEntries.map((item) => {
    const text = `${item.title} ${item.content}`;
    return {
      id: `knowledge:${item.id}`,
      title: item.title,
      snippet: toSnippet(item.content),
      score: calcOverlapScore(query, text) * 0.85 + 0.15,
      source: 'vector',
      metadata: {
        entity: 'knowledge_entry',
        category: item.category,
        updatedAt: item.updatedAt,
      },
    };
  });

  const aiRequirementCandidates: QueryCandidate[] = aiRequirements.map((item) => {
    const text = `${item.title} ${item.content}`;
    return {
      id: `ai_requirement:${item.id}`,
      title: item.title,
      snippet: toSnippet(item.content),
      score: calcOverlapScore(query, text) * 0.8 + 0.2,
      source: 'vector',
      metadata: {
        entity: 'ai_requirement',
        updatedAt: item.updatedAt,
      },
    };
  });

  return [...knowledgeCandidates, ...aiRequirementCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function executeOneSource(
  source: QuerySource,
  plan: QueryPlan,
  query: string,
  projectIds: string[],
  limit: number
): Promise<SourceExecutionResult> {
  const startedAt = Date.now();
  try {
    let items: QueryCandidate[] = [];
    if (source === 'relational') {
      items = await executeRelational(query, projectIds, limit);
    } else if (source === 'graph') {
      items = await executeGraph(query, projectIds, limit);
    } else {
      items = await executeVector(query, projectIds, limit);
    }

    return {
      source,
      success: true,
      plan,
      items,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      source,
      success: false,
      plan,
      items: [],
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      latencyMs: Date.now() - startedAt,
    };
  }
}

function mergeCandidates(results: SourceExecutionResult[], topK: number): QueryCandidate[] {
  const map = new Map<string, QueryCandidate>();

  for (const result of results) {
    for (const item of result.items) {
      const existing = map.get(item.id);
      if (!existing || item.score > existing.score) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function executeMultiSourceQuery(input: {
  query: string;
  projectIds: string[];
  topK: number;
}): Promise<{
  plans: QueryPlan[];
  sourceResults: SourceExecutionResult[];
  mergedCandidates: QueryCandidate[];
}> {
  const plans = buildQueryPlans(input.query, input.projectIds);
  const sourceResults = await Promise.all(
    plans.map((plan) =>
      executeOneSource(plan.source, plan, input.query, input.projectIds, input.topK)
    )
  );

  return {
    plans,
    sourceResults,
    mergedCandidates: mergeCandidates(sourceResults, input.topK),
  };
}
