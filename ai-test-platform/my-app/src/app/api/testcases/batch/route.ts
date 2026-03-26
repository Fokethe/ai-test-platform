import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import {
  ensureLegacyRequirementForAiRequirement,
  ensureProjectDefaultLegacyRequirement,
  resolveLegacyRequirementId,
} from '@/lib/requirements/legacy-bridge';

type StepInput = {
  order?: number;
  action?: string;
  expected?: string;
};

type TestCaseInput = {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  precondition?: string;
  expectedResult?: string;
  priority?: string;
  steps?: unknown;
  tags?: unknown;
  module?: string;
  projectId?: string;
  requirementId?: string;
};

type BatchPayload = {
  projectId?: string;
  requirementId?: string;
  testCases?: TestCaseInput[];
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizePriority(value: unknown): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const normalized = normalizeText(value).toUpperCase();
  switch (normalized) {
    case 'P0':
    case 'CRITICAL':
      return 'CRITICAL';
    case 'P1':
    case 'HIGH':
      return 'HIGH';
    case 'P3':
    case 'LOW':
      return 'LOW';
    case 'P2':
    case 'MEDIUM':
    default:
      return 'MEDIUM';
  }
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeSteps(value: unknown): StepInput[] {
  if (Array.isArray(value)) {
    if (value.every((step) => typeof step === 'string')) {
      return value.map((step, index) => ({
        order: index + 1,
        action: String(step).trim(),
      }));
    }

    return value
      .map((step, index) => {
        if (typeof step === 'object' && step !== null) {
          const record = step as Record<string, unknown>;
          const action = normalizeText(record.action ?? record.step ?? record.content);
          if (!action) {
            return null;
          }
          const orderValue = typeof record.order === 'number' ? record.order : NaN;
          return {
            order: Number.isFinite(orderValue) ? orderValue : index + 1,
            action,
            expected: normalizeText(record.expected ?? record.expectation),
          };
        }
        return null;
      })
      .filter((step): step is StepInput => !!step);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return normalizeSteps(parsed);
    } catch {
      const lines = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.map((line, index) => ({
        order: index + 1,
        action: line,
      }));
    }
  }

  return [];
}

async function inferProjectAndRequirement(rawRequirementId: string) {
  const legacyRequirement = await prisma.requirement.findUnique({
    where: { id: rawRequirementId },
    select: {
      id: true,
      page: {
        select: {
          system: {
            select: {
              projectId: true,
            },
          },
        },
      },
    },
  });

  if (legacyRequirement?.page?.system?.projectId) {
    return {
      projectId: legacyRequirement.page.system.projectId,
      requirementId: legacyRequirement.id,
    };
  }

  const aiRequirement = await prisma.aiRequirement.findUnique({
    where: { id: rawRequirementId },
    select: {
      id: true,
      projectId: true,
      title: true,
      content: true,
    },
  });

  if (!aiRequirement) {
    return null;
  }

  const legacyId = await ensureLegacyRequirementForAiRequirement({
    aiRequirementId: aiRequirement.id,
    projectId: aiRequirement.projectId,
    title: aiRequirement.title,
    description: aiRequirement.content,
  });

  return {
    projectId: aiRequirement.projectId,
    requirementId: legacyId,
  };
}

async function resolveTarget(
  item: TestCaseInput,
  body: BatchPayload,
  userId: string,
  accessCache: Map<string, boolean>,
  defaultRequirementCache: Map<string, string>
) {
  const rawRequirementId = normalizeText(item.requirementId || body.requirementId);
  let projectId = normalizeText(item.projectId || body.projectId);
  let requirementId = '';

  if (projectId && rawRequirementId) {
    const resolved = await resolveLegacyRequirementId({ projectId, requirementId: rawRequirementId });
    if (resolved) {
      requirementId = resolved;
    } else {
      const inferred = await inferProjectAndRequirement(rawRequirementId);
      if (inferred && inferred.projectId === projectId) {
        requirementId = inferred.requirementId;
      } else {
        return { error: 'requirementId is invalid for project' } as const;
      }
    }
  }

  if (!projectId && rawRequirementId) {
    const inferred = await inferProjectAndRequirement(rawRequirementId);
    if (!inferred) {
      return { error: 'requirementId is invalid' } as const;
    }
    projectId = inferred.projectId;
    requirementId = inferred.requirementId;
  }

  if (!projectId) {
    return { error: 'projectId is required' } as const;
  }

  if (!accessCache.has(projectId)) {
    accessCache.set(projectId, await hasProjectAccess(userId, projectId));
  }
  if (!accessCache.get(projectId)) {
    return { error: 'forbidden' } as const;
  }

  if (!requirementId) {
    const existingRequirement = await prisma.requirement.findFirst({
      where: { page: { system: { projectId } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existingRequirement) {
      requirementId = existingRequirement.id;
    } else {
      if (!defaultRequirementCache.has(projectId)) {
        const title = normalizeText(item.title || item.name) || 'AI 批量保存需求';
        const id = await ensureProjectDefaultLegacyRequirement(projectId, title);
        defaultRequirementCache.set(projectId, id);
      }
      requirementId = defaultRequirementCache.get(projectId)!;
    }
  }

  return {
    projectId,
    requirementId,
  } as const;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: BatchPayload;
  try {
    body = (await request.json()) as BatchPayload;
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const testCases = Array.isArray(body.testCases) ? body.testCases : [];
  if (testCases.length === 0) {
    return errors.badRequest('testCases is required');
  }

  const accessCache = new Map<string, boolean>();
  const defaultRequirementCache = new Map<string, string>();
  const prepared: Array<{
    index: number;
    name: string;
    description: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tags: string[];
    steps: StepInput[];
    projectId: string;
    requirementId: string;
  }> = [];

  for (let index = 0; index < testCases.length; index += 1) {
    const item = testCases[index];
    const name = normalizeText(item.name || item.title);
    if (!name) {
      return errors.badRequest(`testCases[${index}].name/title is required`);
    }

    const target = await resolveTarget(
      item,
      body,
      session.user.id,
      accessCache,
      defaultRequirementCache
    );
    if ('error' in target) {
      if (target.error === 'forbidden') {
        return errors.forbidden();
      }
      return errors.badRequest(`testCases[${index}]: ${target.error}`);
    }

    const steps = normalizeSteps(item.steps);
    const priority = normalizePriority(item.priority);
    const descriptionParts = [
      normalizeText(item.description),
      normalizeText(item.precondition),
      normalizeText(item.expectedResult),
    ].filter(Boolean);

    prepared.push({
      index,
      name,
      description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
      priority,
      tags: normalizeTags(item.tags),
      steps,
      projectId: target.projectId,
      requirementId: target.requirementId,
    });
  }

  const createdCases = await prisma.$transaction(
    prepared.map((item) =>
      prisma.test.create({
        data: {
          name: item.name,
          description: item.description,
          type: 'CASE',
          status: 'ACTIVE',
          priority: item.priority,
          source: 'AI',
          tags: item.tags.length > 0 ? JSON.stringify(item.tags) : null,
          content:
            item.steps.length > 0
              ? JSON.stringify(
                  item.steps.map((step, index) => ({
                    order:
                      typeof step.order === 'number' && Number.isFinite(step.order)
                        ? step.order
                        : index + 1,
                    action: normalizeText(step.action) || `步骤 ${index + 1}`,
                    expected: normalizeText(step.expected),
                  }))
                )
              : null,
          projectId: item.projectId,
          requirementId: item.requirementId,
          createdBy: session.user.id,
        },
        select: {
          id: true,
          name: true,
          projectId: true,
          requirementId: true,
          createdAt: true,
        },
      })
    )
  );

  return successResponse(
    {
      saved: createdCases.length,
      count: createdCases.length,
      cases: createdCases,
    },
    `Saved ${createdCases.length} test cases`
  );
}
