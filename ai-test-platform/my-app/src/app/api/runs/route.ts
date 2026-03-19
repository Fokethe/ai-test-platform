import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma, RunType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createdResponse, errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';

const createRunSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  projectId: z.string().min(1),
  type: z.enum(['MANUAL', 'SCHEDULED', 'WEBHOOK', 'API']).optional(),
  testIds: z.array(z.string().min(1)).max(500).optional(),
  startNow: z.boolean().optional(),
  cron: z.string().optional(),
});

function parsePageParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

async function resolveAccessibleProjectIds(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        {
          members: {
            some: { userId },
          },
        },
        {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
        {
          workspace: {
            ownerId: userId,
          },
        },
      ],
    },
    select: { id: true },
  });

  return projects.map((project) => project.id);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId')?.trim() || undefined;
  const type = searchParams.get('type') as RunType | null;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search')?.trim() || undefined;
  const { page, pageSize, skip, take } = parsePageParams(searchParams);

  if (projectId) {
    const canAccess = await hasProjectAccess(session.user.id, projectId);
    if (!canAccess) {
      return errors.forbidden();
    }
  }

  const accessibleProjectIds = projectId
    ? [projectId]
    : await resolveAccessibleProjectIds(session.user.id);

  const where: Prisma.RunWhereInput = {
    OR: [
      {
        createdBy: session.user.id,
      },
      ...(accessibleProjectIds.length > 0
        ? [
            {
              projectId: {
                in: accessibleProjectIds,
              },
            } as Prisma.RunWhereInput,
          ]
        : []),
    ],
  };

  if (projectId) {
    where.projectId = projectId;
  }
  if (type) {
    where.type = type;
  }
  if (status) {
    where.status = status as Prisma.RunWhereInput['status'];
  }
  if (search) {
    where.name = {
      contains: search,
    };
  }

  const [total, runs] = await Promise.all([
    prisma.run.count({ where }),
    prisma.run.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return successResponse({
    list: runs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    },
    meta: {
      total,
      page,
      pageSize,
      totalPages,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const canAccess = await hasProjectAccess(session.user.id, parsed.data.projectId);
  if (!canAccess) {
    return errors.forbidden();
  }

  const testIds = Array.from(new Set(parsed.data.testIds || []));
  const tests =
    testIds.length > 0
      ? await prisma.test.findMany({
          where: {
            id: { in: testIds },
            projectId: parsed.data.projectId,
          },
          select: { id: true },
        })
      : [];

  if (tests.length !== testIds.length) {
    return errors.badRequest('Some testIds are invalid or out of project scope');
  }

  const now = new Date();
  const runType = parsed.data.type || (parsed.data.cron ? 'SCHEDULED' : 'MANUAL');
  const status = parsed.data.startNow ? 'RUNNING' : 'PENDING';
  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.run.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        projectId: parsed.data.projectId,
        createdBy: session.user.id,
        type: runType,
        cron: parsed.data.cron,
        scheduleId: runType === 'SCHEDULED' ? `sch-${Date.now()}` : null,
        status,
        totalCount: tests.length,
        passedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        startedAt: parsed.data.startNow ? now : null,
      },
    });

    if (tests.length > 0) {
      await tx.execution.createMany({
        data: tests.map((test) => ({
          runId: created.id,
          testId: test.id,
          status: 'PENDING',
        })),
      });
    }

    return created;
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RUN_CREATED',
    target: 'RUN',
    targetId: run.id,
    projectId: run.projectId || undefined,
    metadata: {
      type: run.type,
      status: run.status,
      totalCount: run.totalCount,
      createdAt: run.createdAt.toISOString(),
    },
  });

  if (parsed.data.startNow) {
    await writeAuditLog({
      actorId: session.user.id,
      action: 'RUN_STARTED',
      target: 'RUN',
      targetId: run.id,
      projectId: run.projectId || undefined,
      metadata: {
        startedAt: run.startedAt?.toISOString(),
      },
    });
  }

  return createdResponse(run);
}
