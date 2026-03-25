import { NextRequest } from 'next/server';
import { Prisma, RunStatus, RunType } from '@prisma/client';
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
} from '@/lib/api-response';
import { buildQueryParams, parseJsonBody } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'name', 'status', 'startedAt']);
const RUN_TYPES: RunType[] = ['MANUAL', 'SCHEDULED', 'WEBHOOK', 'API'];
const RUN_STATUSES: RunStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

type RunsQuery = {
  type: RunType | null;
  status: RunStatus | null;
  projectId: string;
  search: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

type CreateRunBody = {
  name?: unknown;
  description?: unknown;
  projectId?: unknown;
  testIds?: unknown;
  type?: unknown;
  cron?: unknown;
  nextRunAt?: unknown;
  autoStart?: unknown;
};

type NormalizedCreateRunInput = {
  name: string;
  description: string | null;
  projectId: string;
  testIds: string[];
  type: RunType;
  cron: string | null;
  nextRunAtInput: string;
  autoStart: boolean;
};

type RunCreationContext = {
  userId: string;
  input: NormalizedCreateRunInput;
  tests: Array<{ id: string }>;
  runName: string;
  nextRunAt: Date | null;
};

type RunCreatePreparation =
  | { context: RunCreationContext; response: null }
  | { context: null; response: Response };

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function parseEnumValue<T extends string>(value: unknown, options: readonly T[]): T | null {
  if (typeof value !== 'string') {
    return null;
  }
  return options.includes(value as T) ? (value as T) : null;
}

function parseTestIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function buildAccessibleRunsScope(userId: string): Prisma.RunWhereInput {
  return {
    OR: [
      {
        project: { workspace: { members: { some: { userId } } } },
      },
      { createdBy: userId },
    ],
  };
}

function parseRunsQuery(request: NextRequest): RunsQuery {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = buildQueryParams(searchParams);

  return {
    type: parseEnumValue(searchParams.get('type'), RUN_TYPES),
    status: parseEnumValue(searchParams.get('status'), RUN_STATUSES),
    projectId: normalizeText(searchParams.get('projectId')),
    search: normalizeText(searchParams.get('search')),
    sort: normalizeText(searchParams.get('sort')),
    order: searchParams.get('order') === 'asc' ? 'asc' : 'desc',
    page,
    pageSize,
    skip,
    take,
  };
}

async function ensureProjectAccessibleIfProvided(userId: string, projectId: string) {
  if (!projectId) {
    return null;
  }
  const canAccessProject = await hasProjectAccess(userId, projectId);
  return canAccessProject ? null : errors.forbidden();
}

function buildRunsWhere(userId: string, query: RunsQuery): Prisma.RunWhereInput {
  const filters: Prisma.RunWhereInput[] = [buildAccessibleRunsScope(userId)];

  if (query.type) {
    filters.push({ type: query.type });
  }
  if (query.status) {
    filters.push({ status: query.status });
  }
  if (query.projectId) {
    filters.push({ projectId: query.projectId });
  }
  if (query.search) {
    filters.push({
      OR: [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ],
    });
  }

  return { AND: filters };
}

function buildRunsOrderBy(query: RunsQuery): Prisma.RunOrderByWithRelationInput {
  if (!ALLOWED_SORT_FIELDS.has(query.sort)) {
    return { createdAt: 'desc' };
  }
  return { [query.sort]: query.order } as Prisma.RunOrderByWithRelationInput;
}

function normalizeCreateRunInput(body: CreateRunBody): NormalizedCreateRunInput {
  return {
    name: normalizeText(body.name),
    description: normalizeText(body.description) || null,
    projectId: normalizeText(body.projectId),
    testIds: parseTestIds(body.testIds),
    type: parseEnumValue(body.type, RUN_TYPES) ?? 'MANUAL',
    cron: normalizeText(body.cron) || null,
    nextRunAtInput: normalizeText(body.nextRunAt),
    autoStart: body.autoStart === false ? false : true,
  };
}

function validateRunRequiredFields(input: NormalizedCreateRunInput) {
  if (!input.projectId) {
    return errors.badRequest('projectId is required');
  }
  if (input.testIds.length === 0) {
    return errors.badRequest('testIds is required');
  }
  return null;
}

async function ensureProjectAccessible(userId: string, projectId: string) {
  const canAccessProject = await hasProjectAccess(userId, projectId);
  return canAccessProject ? null : errors.forbidden();
}

async function ensureTestsBelongToProject(projectId: string, testIds: string[]) {
  const tests = await prisma.test.findMany({
    where: { id: { in: testIds }, projectId },
    select: { id: true },
  });
  return tests.length === testIds.length ? tests : null;
}

function parseNextRunAt(value: string): { nextRunAt: Date | null; response: ReturnType<typeof errors.badRequest> | null } {
  if (!value) {
    return { nextRunAt: null, response: null };
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { nextRunAt: null, response: errors.badRequest('nextRunAt is invalid') };
  }
  return { nextRunAt: parsedDate, response: null };
}

async function parseAndValidateCreateRunInput(request: NextRequest) {
  const parseResult = await parseJsonBody<CreateRunBody>(request);
  if (!parseResult.success) {
    return { input: null, response: parseResult.error };
  }

  const input = normalizeCreateRunInput(parseResult.data);
  const requiredFieldError = validateRunRequiredFields(input);
  if (requiredFieldError) {
    return { input: null, response: requiredFieldError };
  }

  return { input, response: null };
}

async function buildRunCreationContext(request: NextRequest, userId: string): Promise<RunCreatePreparation> {
  const parsedInput = await parseAndValidateCreateRunInput(request);
  if (parsedInput.response || !parsedInput.input) {
    return { context: null, response: parsedInput.response as Response };
  }

  const projectAccessError = await ensureProjectAccessible(userId, parsedInput.input.projectId);
  if (projectAccessError) {
    return { context: null, response: projectAccessError };
  }

  const tests = await ensureTestsBelongToProject(parsedInput.input.projectId, parsedInput.input.testIds);
  if (!tests) {
    return { context: null, response: errors.badRequest('Some testIds are invalid for this project') };
  }

  const nextRunAtResult = parseNextRunAt(parsedInput.input.nextRunAtInput);
  if (nextRunAtResult.response) {
    return { context: null, response: nextRunAtResult.response };
  }

  const runName = parsedInput.input.name || `Run ${new Date().toLocaleString()}`;

  return {
    context: {
      userId,
      input: parsedInput.input,
      tests,
      runName,
      nextRunAt: nextRunAtResult.nextRunAt,
    },
    response: null,
  };
}

function buildRunCreateData(context: RunCreationContext): Prisma.RunCreateInput {
  const status: RunStatus = context.input.autoStart ? 'RUNNING' : 'PENDING';
  const startedAt = context.input.autoStart ? new Date() : null;

  return {
    name: context.runName,
    description: context.input.description,
    project: {
      connect: { id: context.input.projectId },
    },
    createdBy: context.userId,
    type: context.input.type,
    status,
    cron: context.input.cron,
    nextRunAt: context.nextRunAt,
    startedAt,
    totalCount: context.tests.length,
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    executions: {
      create: context.tests.map((test) => ({
        testId: test.id,
        status: 'PENDING',
      })),
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  try {
    const query = parseRunsQuery(request);
    const accessError = await ensureProjectAccessibleIfProvided(session.user.id, query.projectId);
    if (accessError) {
      return accessError;
    }

    const where = buildRunsWhere(session.user.id, query);
    const orderBy = buildRunsOrderBy(query);
    const [total, runs] = await Promise.all([
      prisma.run.count({ where }),
      prisma.run.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return listResponse(runs, buildMeta(total, query.page, query.pageSize));
  } catch (requestError) {
    console.error('Failed to fetch runs:', requestError);
    return errorResponse('Failed to fetch runs', 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const preparation = await buildRunCreationContext(request, session.user.id);
  if (preparation.response || !preparation.context) {
    return preparation.response;
  }

  try {
    const run = await prisma.run.create({
      data: buildRunCreateData(preparation.context),
      include: {
        executions: {
          select: { id: true, testId: true, status: true },
        },
      },
    });

    return createdResponse(run);
  } catch (requestError) {
    console.error('Failed to create run:', requestError);
    return errorResponse('Failed to create run', 500);
  }
}
