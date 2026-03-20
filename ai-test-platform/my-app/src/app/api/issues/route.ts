import { NextRequest } from 'next/server';
import { IssueStatus, IssueType, Prisma, Severity } from '@prisma/client';
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

const ISSUE_TYPES: IssueType[] = ['BUG', 'TASK', 'IMPROVEMENT', 'QUESTION'];
const ISSUE_STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const ISSUE_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

type IssuesQuery = {
  projectId: string;
  type: IssueType | null;
  status: IssueStatus | null;
  severity: Severity | null;
  assigneeId: string;
  search: string;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

type CreateIssueBody = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  severity?: unknown;
  priority?: unknown;
  projectId?: unknown;
  testId?: unknown;
  runId?: unknown;
  assigneeId?: unknown;
  executionId?: unknown;
};

type CreateIssueInput = {
  title: string;
  description: string | null;
  type: IssueType;
  severity: Severity;
  priority: string;
  projectId: string;
  testId: string | null;
  runId: string | null;
  assigneeId: string | null;
  executionId: string;
};

type ExecutionContext = {
  id: string;
  status: string;
  errorMessage: string | null;
  completedAt: Date | null;
  test: { id: string; name: string };
  run: { id: string; name: string; projectId: string };
};

type CreateIssuePreparation =
  | { input: CreateIssueInput; response: null }
  | { input: null; response: Response };

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

function buildAccessibleIssuesScope(userId: string): Prisma.IssueWhereInput {
  return {
    OR: [
      { project: { workspace: { members: { some: { userId } } } } },
      { reporterId: userId },
      { assigneeId: userId },
    ],
  };
}

function parseIssuesQuery(request: NextRequest): IssuesQuery {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = buildQueryParams(searchParams);

  return {
    projectId: normalizeText(searchParams.get('projectId')),
    type: parseEnumValue(searchParams.get('type'), ISSUE_TYPES),
    status: parseEnumValue(searchParams.get('status'), ISSUE_STATUSES),
    severity: parseEnumValue(searchParams.get('severity'), ISSUE_SEVERITIES),
    assigneeId: normalizeText(searchParams.get('assigneeId')),
    search: normalizeText(searchParams.get('search')),
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

function buildIssuesWhere(userId: string, query: IssuesQuery): Prisma.IssueWhereInput {
  const filters: Prisma.IssueWhereInput[] = [buildAccessibleIssuesScope(userId)];

  if (query.projectId) {
    filters.push({ projectId: query.projectId });
  }
  if (query.type) {
    filters.push({ type: query.type });
  }
  if (query.status) {
    filters.push({ status: query.status });
  }
  if (query.severity) {
    filters.push({ severity: query.severity });
  }
  if (query.assigneeId) {
    filters.push({ assigneeId: query.assigneeId });
  }
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ],
    });
  }

  return { AND: filters };
}

function normalizeCreateIssueInput(body: CreateIssueBody): CreateIssueInput {
  const severity = parseEnumValue(body.severity, ISSUE_SEVERITIES) ?? 'MEDIUM';

  return {
    title: normalizeText(body.title),
    description: normalizeText(body.description) || null,
    type: parseEnumValue(body.type, ISSUE_TYPES) ?? 'BUG',
    severity,
    priority: normalizeText(body.priority) || severity,
    projectId: normalizeText(body.projectId),
    testId: normalizeText(body.testId) || null,
    runId: normalizeText(body.runId) || null,
    assigneeId: normalizeText(body.assigneeId) || null,
    executionId: normalizeText(body.executionId),
  };
}

async function findExecutionContext(executionId: string): Promise<ExecutionContext | null> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: {
      test: { select: { id: true, name: true } },
      run: { select: { id: true, name: true, projectId: true } },
    },
  });

  if (!execution || !execution.run.projectId) {
    return null;
  }

  return {
    id: execution.id,
    status: execution.status,
    errorMessage: execution.errorMessage,
    completedAt: execution.completedAt,
    test: execution.test,
    run: {
      id: execution.run.id,
      name: execution.run.name,
      projectId: execution.run.projectId,
    },
  };
}

function mergeIssueInputWithExecution(input: CreateIssueInput, execution: ExecutionContext): CreateIssueInput {
  const evidenceLines = [
    `Execution: ${execution.id}`,
    `Run: ${execution.run.name} (${execution.run.id})`,
    `Test: ${execution.test.name} (${execution.test.id})`,
    `Status: ${execution.status}`,
    execution.errorMessage ? `Error: ${execution.errorMessage}` : null,
    execution.completedAt ? `CompletedAt: ${execution.completedAt.toISOString()}` : null,
  ].filter((line): line is string => Boolean(line));

  const projectId = input.projectId || execution.run.projectId;
  const runId = input.runId ?? execution.run.id;
  const testId = input.testId ?? execution.test.id;
  const title = input.title || `Failed execution: ${execution.test.name}`;
  const description = [input.description, '', 'Failure Context', ...evidenceLines]
    .filter(Boolean)
    .join('\n');

  return {
    ...input,
    projectId,
    runId,
    testId,
    title,
    description,
  };
}

function validateExecutionStatus(execution: ExecutionContext) {
  return execution.status === 'FAILED' || execution.status === 'ERROR';
}

function validateRequiredFields(input: CreateIssueInput) {
  if (!input.title || !input.projectId) {
    return errors.badRequest('title and projectId are required');
  }
  return null;
}

async function ensureProjectAccessible(userId: string, projectId: string) {
  const canAccessProject = await hasProjectAccess(userId, projectId);
  return canAccessProject ? null : errors.forbidden();
}

async function ensureRunBelongsToProject(projectId: string, runId: string | null) {
  if (!runId) {
    return null;
  }
  const run = await prisma.run.findFirst({
    where: { id: runId, projectId },
    select: { id: true },
  });
  return run ? null : errors.badRequest('runId is invalid for this project');
}

async function ensureTestBelongsToProject(projectId: string, testId: string | null) {
  if (!testId) {
    return null;
  }
  const test = await prisma.test.findFirst({
    where: { id: testId, projectId },
    select: { id: true },
  });
  return test ? null : errors.badRequest('testId is invalid for this project');
}

async function parseAndNormalizeIssueInput(request: NextRequest): Promise<CreateIssuePreparation> {
  const parseResult = await parseJsonBody<CreateIssueBody>(request);
  if (!parseResult.success) {
    return { input: null, response: parseResult.error };
  }
  return { input: normalizeCreateIssueInput(parseResult.data), response: null };
}

async function applyExecutionContextIfNeeded(input: CreateIssueInput): Promise<CreateIssuePreparation> {
  if (!input.executionId) {
    return { input, response: null };
  }

  const execution = await findExecutionContext(input.executionId);
  if (!execution) {
    return { input: null, response: errors.badRequest('executionId is invalid') };
  }
  if (!validateExecutionStatus(execution)) {
    return { input: null, response: errors.badRequest('Only failed execution can create issue quickly') };
  }
  if (input.projectId && input.projectId !== execution.run.projectId) {
    return { input: null, response: errors.badRequest('executionId does not belong to projectId') };
  }

  return { input: mergeIssueInputWithExecution(input, execution), response: null };
}

async function validateIssueCreationInput(userId: string, input: CreateIssueInput) {
  const requiredError = validateRequiredFields(input);
  if (requiredError) {
    return requiredError;
  }

  const projectAccessError = await ensureProjectAccessible(userId, input.projectId);
  if (projectAccessError) {
    return projectAccessError;
  }

  const runValidationError = await ensureRunBelongsToProject(input.projectId, input.runId);
  if (runValidationError) {
    return runValidationError;
  }

  return ensureTestBelongsToProject(input.projectId, input.testId);
}

async function resolveIssueInputFromRequest(request: NextRequest): Promise<CreateIssuePreparation> {
  const parsedInput = await parseAndNormalizeIssueInput(request);
  if (parsedInput.response || !parsedInput.input) {
    return { input: null, response: parsedInput.response as Response };
  }

  const executionApplied = await applyExecutionContextIfNeeded(parsedInput.input);
  if (executionApplied.response || !executionApplied.input) {
    return { input: null, response: executionApplied.response as Response };
  }

  return { input: executionApplied.input, response: null };
}

async function createIssueForUser(request: NextRequest, userId: string) {
  const resolvedInput = await resolveIssueInputFromRequest(request);
  if (resolvedInput.response || !resolvedInput.input) {
    return resolvedInput.response;
  }

  const validationError = await validateIssueCreationInput(userId, resolvedInput.input);
  if (validationError) {
    return validationError;
  }

  try {
    const issue = await prisma.issue.create({
      data: {
        title: resolvedInput.input.title,
        description: resolvedInput.input.description,
        type: resolvedInput.input.type,
        severity: resolvedInput.input.severity,
        priority: resolvedInput.input.priority,
        projectId: resolvedInput.input.projectId,
        testId: resolvedInput.input.testId,
        runId: resolvedInput.input.runId,
        assigneeId: resolvedInput.input.assigneeId,
        reporterId: userId,
        status: 'OPEN',
      },
    });
    return createdResponse(issue);
  } catch (requestError) {
    console.error('Failed to create issue:', requestError);
    return errorResponse('Failed to create issue', 500);
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  try {
    const query = parseIssuesQuery(request);
    const accessError = await ensureProjectAccessibleIfProvided(session.user.id, query.projectId);
    if (accessError) {
      return accessError;
    }

    const where = buildIssuesWhere(session.user.id, query);
    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          test: { select: { id: true, name: true } },
          run: { select: { id: true, name: true, status: true } },
        },
      }),
    ]);

    return listResponse(issues, buildMeta(total, query.page, query.pageSize));
  } catch (requestError) {
    console.error('Failed to fetch issues:', requestError);
    return errorResponse('Failed to fetch issues', 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }
  return createIssueForUser(request, session.user.id);
}
