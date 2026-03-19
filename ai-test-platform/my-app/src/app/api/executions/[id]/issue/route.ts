import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createdResponse, errors } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

const createIssueSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  priority: z.string().max(20).optional(),
});

function buildAutoDescription(input: {
  runName: string;
  testName: string;
  errorMessage?: string | null;
  stderr?: string | null;
  stdout?: string | null;
}) {
  const lines = [
    'Auto-generated from failed execution.',
    '',
    `Run: ${input.runName}`,
    `Test: ${input.testName}`,
    `Error: ${input.errorMessage || 'N/A'}`,
  ];

  if (input.stderr) {
    lines.push('', `stderr:`, input.stderr.slice(0, 1200));
  }
  if (input.stdout) {
    lines.push('', `stdout:`, input.stdout.slice(0, 1200));
  }
  return lines.join('\n');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await params;
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
      run: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
      test: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
    },
  });

  if (!execution) {
    return errors.notFound('Execution');
  }

  if (!(execution.status === 'FAILED' || execution.status === 'ERROR')) {
    return errors.badRequest('Issue can only be created from FAILED/ERROR execution');
  }

  const projectId = execution.run.projectId || execution.test.projectId;
  if (!projectId) {
    return errors.badRequest('Execution is not linked to a project');
  }

  const canAccess = await hasProjectAccess(session.user.id, projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const issue = await prisma.$transaction(async (tx) => {
    const createdIssue = await tx.issue.create({
      data: {
        title:
          parsed.data.title ||
          `[Auto] Execution failed - ${execution.test.name}`,
        description:
          parsed.data.description ||
          buildAutoDescription({
            runName: execution.run.name,
            testName: execution.test.name,
            errorMessage: execution.errorMessage,
            stderr: execution.stderr,
            stdout: execution.stdout,
          }),
        type: 'BUG',
        severity: parsed.data.severity || 'HIGH',
        priority: parsed.data.priority || parsed.data.severity || 'HIGH',
        projectId,
        runId: execution.run.id,
        testId: execution.test.id,
        executionId: execution.id,
        reporterId: session.user.id,
        status: 'OPEN',
      },
    });

    await tx.issueLifecycleEvent.create({
      data: {
        issueId: createdIssue.id,
        fromStatus: null,
        toStatus: 'OPEN',
        actorId: session.user.id,
        note: `created_from_execution:${execution.id}`,
        regressionRunId: execution.run.id,
        regressionExecutionId: execution.id,
        regressionResult: execution.status === 'FAILED' || execution.status === 'ERROR'
          ? 'FAILED'
          : undefined,
      },
    });

    return createdIssue;
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'ISSUE_CREATED_FROM_EXECUTION',
    target: 'ISSUE',
    targetId: issue.id,
    projectId,
    metadata: {
      executionId: execution.id,
      runId: execution.run.id,
      testId: execution.test.id,
    },
  });

  return createdResponse(issue);
}
