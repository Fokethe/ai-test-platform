import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { getRAGService } from '@/lib/ai/rag/rag-service';
import {
  QueryCandidate,
  QueryPlan,
  SourceExecutionResult,
  executeMultiSourceQuery,
} from '@/lib/ai/rag/multi-source-query';
import {
  DEFAULT_ROUTING_SOURCES,
  evaluateRoutingRules,
  getLatestRoutingRuleSet,
  parseRoutingRules,
} from '@/lib/ai/rag/logic-routing';
import {
  getActivePromptTemplates,
  selectPromptTemplate,
} from '@/lib/ai/rag/semantic-routing';
import { resolveRagStrategyConfig } from '@/lib/ai/rag/strategy-config';
import {
  refineRetrievalEvidence,
  RefinedEvidence,
} from '@/lib/ai/rag/retrieval-refinement';
import { rerankEvidence } from '@/lib/ai/rag/reranking-service';
import {
  ControlledGenerationMode,
  ControlledGenerationResult,
  runControlledGeneration,
} from '@/lib/ai/rag/controlled-generation';

const searchSchema = z.object({
  query: z.string().min(1, 'query is required').max(1000, 'query is too long'),
  departmentId: z.string().min(1, 'departmentId is required'),
  projectId: z.string().optional(),
  options: z
    .object({
      topK: z.number().int().min(1).max(50).optional(),
      enableHyDE: z.boolean().optional(),
      enableQueryRewrite: z.boolean().optional(),
      enableSelfRAG: z.boolean().optional(),
      enableMultiSource: z.boolean().optional(),
      enableMultiQuery: z.boolean().optional(),
      enableDecomposition: z.boolean().optional(),
      enableFusion: z.boolean().optional(),
      enableRefinement: z.boolean().optional(),
      enableReranking: z.boolean().optional(),
      enableActiveRetrieval: z.boolean().optional(),
      generationMode: z.enum(['standard', 'self-rag', 'rrr']).optional(),
      maxGenerationIterations: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});

type MultiSourceSummary = {
  queryVariants: string[];
  plans: QueryPlan[];
  sourceResults: SourceExecutionResult[];
  mergedCandidates: QueryCandidate[];
  failedSources: Array<{ source: string; error: string }>;
};

function trimContent(content: string, maxLength = 500): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}...`;
}

function dedupeText(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function buildQueryVariants(
  query: string,
  toggles: { multiQuery: boolean; decomposition: boolean }
): string[] {
  const variants: string[] = [query];

  if (toggles.multiQuery) {
    variants.push(`${query} test scenario`);
    variants.push(`${query} edge case`);
  }

  if (toggles.decomposition) {
    const splitByPunctuation = query
      .split(/[,.;!?，。；！？、]/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
    variants.push(...splitByPunctuation);
  }

  return dedupeText(variants).slice(0, 4);
}

function mergeCandidates(candidates: QueryCandidate[], topK: number): QueryCandidate[] {
  const map = new Map<string, QueryCandidate>();
  for (const item of candidates) {
    const existing = map.get(item.id);
    if (!existing || item.score > existing.score) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function toFailedSources(sourceResults: SourceExecutionResult[]) {
  return sourceResults
    .filter((item) => !item.success)
    .map((item) => ({
      source: item.source,
      error: item.error || 'UNKNOWN_ERROR',
    }));
}

function withVariantTag(
  result: Awaited<ReturnType<typeof executeMultiSourceQuery>>,
  variant: string
): { plans: QueryPlan[]; sourceResults: SourceExecutionResult[]; mergedCandidates: QueryCandidate[] } {
  const plans = result.plans.map((plan) => ({
    ...plan,
    params: {
      ...plan.params,
      queryVariant: variant,
    },
  }));

  const sourceResults = result.sourceResults.map((item) => ({
    ...item,
    plan: {
      ...item.plan,
      params: {
        ...item.plan.params,
        queryVariant: variant,
      },
    },
  }));

  const mergedCandidates = result.mergedCandidates.map((item) => ({
    ...item,
    metadata: {
      ...(item.metadata || {}),
      queryVariant: variant,
    },
  }));

  return {
    plans,
    sourceResults,
    mergedCandidates,
  };
}

function mapRagSourcesToCandidates(
  sources: Array<{ id: string; content: string; score: number; metadata?: Record<string, unknown> }>
): QueryCandidate[] {
  return sources.map((source, index) => ({
    id: source.id,
    title: `rag-source-${index + 1}`,
    snippet: trimContent(source.content, 180),
    score: source.score,
    source: 'vector',
    metadata: source.metadata,
  }));
}

function toDefaultRefinedEvidence(candidates: QueryCandidate[], topK: number): RefinedEvidence[] {
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((candidate) => ({
      ...candidate,
      refinedScore: candidate.score,
      reasonSummary: `baseline source=${candidate.source} score=${candidate.score.toFixed(2)}`,
    }));
}

async function resolveAccessibleProjectIds(
  userId: string,
  explicitProjectId?: string
): Promise<{ projectIds: string[]; forbidden: boolean }> {
  if (explicitProjectId) {
    const allowed = await hasProjectAccess(userId, explicitProjectId);
    return {
      projectIds: allowed ? [explicitProjectId] : [],
      forbidden: !allowed,
    };
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { workspace: { members: { some: { userId } } } },
        { workspace: { ownerId: userId } },
      ],
    },
    select: { id: true },
  });

  return {
    projectIds: projects.map((item) => item.id),
    forbidden: false,
  };
}

async function logMultiSourceFailures(input: {
  actorId: string;
  query: string;
  explicitProjectId?: string;
  projectIds: string[];
  failedSources: Array<{ source: string; error: string }>;
}) {
  if (input.failedSources.length === 0) {
    return;
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: 'MULTI_SOURCE_QUERY_PARTIAL_FAILURE',
    target: 'KNOWLEDGE_SEARCH',
    targetId: input.explicitProjectId || 'multi-project-scope',
    projectId:
      input.explicitProjectId || (input.projectIds.length === 1 ? input.projectIds[0] : undefined),
    metadata: {
      queryPreview: input.query.slice(0, 120),
      failedSources: input.failedSources,
      projectScopeCount: input.projectIds.length,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const validated = searchSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validated.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { query, departmentId, projectId, options } = validated.data;
    const topK = options?.topK ?? 10;
    const access = await resolveAccessibleProjectIds(session.user.id, projectId);

    if (access.forbidden) {
      return NextResponse.json({ error: 'FORBIDDEN', code: 'FORBIDDEN' }, { status: 403 });
    }

    const strategy = await resolveRagStrategyConfig({
      projectId,
      overrides: {
        multiQuery: options?.enableMultiQuery,
        hyde: options?.enableHyDE,
        decomposition: options?.enableDecomposition,
        fusion: options?.enableFusion,
      },
    });

    const latestRoutingRuleSet = await getLatestRoutingRuleSet(projectId);
    let routingRules: ReturnType<typeof parseRoutingRules> = [];
    if (latestRoutingRuleSet) {
      try {
        routingRules = parseRoutingRules(JSON.parse(latestRoutingRuleSet.rulesJson));
      } catch {
        routingRules = [];
      }
    }
    const routingDecision = evaluateRoutingRules({
      rules: routingRules,
      context: {
        query,
        departmentId,
        projectId,
      },
    });

    const shouldRunMultiSource =
      options?.enableMultiSource ??
      (strategy.toggles.multiQuery ||
        strategy.toggles.decomposition ||
        strategy.toggles.fusion ||
        !!routingDecision.matchedRule);
    const enableActiveRetrieval = options?.enableActiveRetrieval ?? false;

    const activePromptTemplates = await getActivePromptTemplates(projectId);
    const semanticRouting = selectPromptTemplate({
      query,
      templates: activePromptTemplates,
    });

    const ragService = getRAGService({
      departmentId,
      departmentName: departmentId,
      projectId,
      projectName: projectId,
      topK,
      enableHyDE: strategy.toggles.hyde,
      enableQueryRewrite: options?.enableQueryRewrite ?? true,
      enableSelfRAG: options?.enableSelfRAG ?? false,
    });

    await ragService.initialize();

    const startTime = Date.now();
    const ragResult = await ragService.query(query);
    const totalTime = Date.now() - startTime;

    let multiSource: MultiSourceSummary | undefined;
    let fusedEvidence: QueryCandidate[] | undefined;

    if (shouldRunMultiSource) {
      const queryVariants = buildQueryVariants(query, {
        multiQuery: strategy.toggles.multiQuery,
        decomposition: strategy.toggles.decomposition,
      });

      const variantResults = await Promise.all(
        queryVariants.map(async (variant) => ({
          variant,
          result: await executeMultiSourceQuery({
            query: variant,
            projectIds: access.projectIds,
            topK,
          }),
        }))
      );

      const taggedResults = variantResults.map((item) =>
        withVariantTag(item.result, item.variant)
      );
      const selectedSources = routingDecision.selectedSources.length
        ? routingDecision.selectedSources
        : DEFAULT_ROUTING_SOURCES;
      const plans = taggedResults
        .flatMap((item) => item.plans)
        .filter((item) => selectedSources.includes(item.source));
      const sourceResults = taggedResults
        .flatMap((item) => item.sourceResults)
        .filter((item) => selectedSources.includes(item.source));
      const mergedCandidates = mergeCandidates(
        taggedResults
          .flatMap((item) => item.mergedCandidates)
          .filter((item) => selectedSources.includes(item.source)),
        topK
      );
      const failedSources = toFailedSources(sourceResults);

      multiSource = {
        queryVariants,
        plans,
        sourceResults,
        mergedCandidates,
        failedSources,
      };

      await logMultiSourceFailures({
        actorId: session.user.id,
        query,
        explicitProjectId: projectId,
        projectIds: access.projectIds,
        failedSources,
      });

      if (strategy.toggles.fusion) {
        const ragCandidates = mapRagSourcesToCandidates(ragResult.sources);
        fusedEvidence = mergeCandidates([...ragCandidates, ...mergedCandidates], topK);
      }
    }

    const epic5Enabled =
      (options?.enableRefinement ?? false) ||
      (options?.enableReranking ?? false) ||
      (options?.enableActiveRetrieval ?? false) ||
      Boolean(options?.generationMode);
    const generationMode: ControlledGenerationMode =
      options?.generationMode || (options?.enableSelfRAG ? 'self-rag' : 'standard');

    let finalAnswer = ragResult.answer;
    let finalCitations = ragResult.citations;
    let retrievalRefinement:
      | {
          enabled: boolean;
          coverage: number;
          items: Array<{
            id: string;
            source: string;
            refinedScore: number;
            reasonSummary: string;
          }>;
          explainability: ReturnType<typeof refineRetrievalEvidence>['explainability'];
        }
      | undefined;
    let reranking:
      | {
          enabled: boolean;
          model: string;
          top: Array<{
            id: string;
            source: string;
            rank: number;
            rerankScore: number;
            rationale: string[];
          }>;
        }
      | undefined;
    let generationControl:
      | {
          mode: ControlledGenerationMode;
          iterations: number;
          confidence: number;
          activeRetrievalTriggered: boolean;
          trace: ControlledGenerationResult['trace'];
          usedEvidence: Array<{
            id: string;
            source: string;
            rerankScore: number;
          }>;
        }
      | undefined;

    if (epic5Enabled) {
      const ragCandidates = mapRagSourcesToCandidates(ragResult.sources);
      const candidateBase = mergeCandidates(
        [
          ...ragCandidates,
          ...(multiSource?.mergedCandidates || []),
          ...(fusedEvidence || []),
        ],
        Math.max(topK, 8)
      );

      const refinementResult = options?.enableRefinement
        ? refineRetrievalEvidence({
            query,
            candidates: candidateBase,
            topK: Math.max(topK, 8),
          })
        : {
            items: toDefaultRefinedEvidence(candidateBase, Math.max(topK, 8)),
            explainability: [],
            coverage: 0,
          };

      retrievalRefinement = {
        enabled: options?.enableRefinement ?? false,
        coverage: refinementResult.coverage,
        items: refinementResult.items.map((item) => ({
          id: item.id,
          source: item.source,
          refinedScore: item.refinedScore,
          reasonSummary: item.reasonSummary,
        })),
        explainability: refinementResult.explainability,
      };

      const rerankingResult = options?.enableReranking
        ? rerankEvidence({
            query,
            candidates: refinementResult.items,
            topN: Math.max(topK, 8),
          })
        : {
            model: 'cross-encoder-lite' as const,
            items: refinementResult.items.map((item, index) => ({
              ...item,
              rerankScore: item.refinedScore,
              rank: index + 1,
              rationale: ['reranking_disabled'],
            })),
          };

      reranking = {
        enabled: options?.enableReranking ?? false,
        model: rerankingResult.model,
        top: rerankingResult.items.map((item) => ({
          id: item.id,
          source: item.source,
          rank: item.rank,
          rerankScore: item.rerankScore,
          rationale: item.rationale,
        })),
      };

      const generationResult = await runControlledGeneration({
        query,
        mode: generationMode,
        evidence: rerankingResult.items,
        activeRetrieval: enableActiveRetrieval,
        maxIterations: options?.maxGenerationIterations,
        retrieveMore: shouldRunMultiSource || enableActiveRetrieval
          ? async (followupQuery: string) => {
              const extra = await executeMultiSourceQuery({
                query: followupQuery,
                projectIds: access.projectIds,
                topK: Math.max(topK, 8),
              });
              return extra.mergedCandidates;
            }
          : undefined,
      });

      finalAnswer = generationResult.answer;
      finalCitations = generationResult.citations.map(
        (citation) => `${citation.label} ${citation.source}: ${citation.excerpt}`
      );
      generationControl = {
        mode: generationResult.mode,
        iterations: generationResult.iterations,
        confidence: generationResult.confidence,
        activeRetrievalTriggered: generationResult.activeRetrievalTriggered,
        trace: generationResult.trace,
        usedEvidence: generationResult.usedEvidence.map((item) => ({
          id: item.id,
          source: item.source,
          rerankScore: item.rerankScore,
        })),
      };

      await writeAuditLog({
        actorId: session.user.id,
        action: 'RAG_CONTROLLED_GENERATION_COMPLETED',
        target: 'KNOWLEDGE_SEARCH',
        targetId: projectId || 'multi-project-scope',
        projectId,
        metadata: {
          queryPreview: query.slice(0, 120),
          generationMode,
          iterations: generationResult.iterations,
          confidence: generationResult.confidence,
          activeRetrievalTriggered: generationResult.activeRetrievalTriggered,
        },
      });

      if (generationResult.activeRetrievalTriggered) {
        await writeAuditLog({
          actorId: session.user.id,
          action: 'RAG_ACTIVE_RETRIEVAL_TRIGGERED',
          target: 'KNOWLEDGE_SEARCH',
          targetId: projectId || 'multi-project-scope',
          projectId,
          metadata: {
            queryPreview: query.slice(0, 120),
            trace: generationResult.trace,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        answer: finalAnswer,
        sources: ragResult.sources.map((source) => ({
          id: source.id,
          content: trimContent(source.content),
          score: source.score,
          metadata: source.metadata,
        })),
        citations: finalCitations,
        context: {
          query: ragResult.context.query,
          rewrittenQuery: ragResult.context.rewrittenQuery,
          retrievalTime: ragResult.context.retrievalTime,
          totalTime,
          cacheHit: ragResult.context.cacheHit,
        },
        strategy: {
          configId: strategy.id,
          version: strategy.version,
          source: strategy.source,
          toggles: {
            multiQuery: strategy.toggles.multiQuery,
            hyde: strategy.toggles.hyde,
            decomposition: strategy.toggles.decomposition,
            fusion: strategy.toggles.fusion,
            queryRewrite: options?.enableQueryRewrite ?? true,
            selfRAG: options?.enableSelfRAG ?? false,
            multiSource: shouldRunMultiSource,
          },
        },
        routing: {
          ruleSetVersion: latestRoutingRuleSet?.version ?? 0,
          matchedRule: routingDecision.matchedRule,
          selectedSources: routingDecision.selectedSources,
          reason: routingDecision.reason,
        },
        semanticRouting: {
          templateId: semanticRouting.templateId,
          scenario: semanticRouting.scenario,
          name: semanticRouting.name,
          version: semanticRouting.version,
          confidence: semanticRouting.confidence,
          reason: semanticRouting.reason,
          promptPreview: trimContent(semanticRouting.appliedPrompt, 200),
        },
        multiSource,
        fusedEvidence,
        retrievalRefinement,
        reranking,
        generationControl,
        selfRAG: ragResult.selfRAGResult
          ? {
              reflections: ragResult.selfRAGResult.reflections,
              citations: ragResult.selfRAGResult.citations,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error('Knowledge search failed:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    options: {
      topK: { min: 1, max: 50, default: 10, description: 'Max returned candidates' },
      enableHyDE: { type: 'boolean', default: true, description: 'Enable HyDE retrieval' },
      enableQueryRewrite: { type: 'boolean', default: true, description: 'Enable query rewrite' },
      enableSelfRAG: { type: 'boolean', default: false, description: 'Enable Self-RAG' },
      enableMultiSource: {
        type: 'boolean',
        default: false,
        description: 'Enable relational/graph/vector concurrent retrieval',
      },
      enableMultiQuery: {
        type: 'boolean',
        default: false,
        description: 'Enable query expansion variants',
      },
      enableDecomposition: {
        type: 'boolean',
        default: false,
        description: 'Enable complex query decomposition',
      },
      enableFusion: {
        type: 'boolean',
        default: false,
        description: 'Enable fused evidence output',
      },
      enableRefinement: {
        type: 'boolean',
        default: false,
        description: 'Enable retrieval refinement with explainability',
      },
      enableReranking: {
        type: 'boolean',
        default: false,
        description: 'Enable reranking service for final evidence order',
      },
      enableActiveRetrieval: {
        type: 'boolean',
        default: false,
        description: 'Enable follow-up retrieval during generation',
      },
      generationMode: {
        type: 'enum',
        values: ['standard', 'self-rag', 'rrr'],
        default: 'standard',
        description: 'Controlled generation mode',
      },
      maxGenerationIterations: {
        min: 1,
        max: 5,
        default: 3,
        description: 'Max control-loop iterations',
      },
    },
    features: [
      'Hybrid retrieval (Dense + BM25)',
      'Cross-encoder rerank',
      'Query rewrite',
      'HyDE',
      'Self-RAG',
      'Multi-source planning and execution',
      'Strategy-version metadata',
      'Logic routing rule hint',
      'Semantic template routing',
      'Retrieval refinement explainability',
      'Active retrieval cited generation',
      'Self-RAG / RRR controlled generation',
    ],
  });
}
