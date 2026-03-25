import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { buildQueryParams, parseJsonBody } from '@/lib/api-handler';
import { buildMeta, createdResponse, errorResponse, errors, listResponse } from '@/lib/api-response';
import { buildPersonalWorkspaceName, ensurePersonalWorkspace } from '@/lib/personal-workspace';
import { prisma } from '@/lib/prisma';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isPersonal: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    await ensurePersonalWorkspace(session.user.id, {
      nameHint: session.user.name,
      email: session.user.email,
    });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const where: Prisma.WorkspaceWhereInput = {
      OR: [
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        {
          ownerId: session.user.id,
        },
      ],
    };

    if (search) {
      where.name = {
        contains: search,
      };
    }

    const total = await prisma.workspace.count({ where });
    const workspaces = await prisma.workspace.findMany({
      where,
      skip,
      take,
      orderBy: [{ isPersonal: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: {
          select: { projects: true, members: true },
        },
      },
    });

    const formattedWorkspaces = workspaces.map((workspace) => ({
      ...workspace,
      projectCount: workspace._count.projects,
      memberCount: workspace._count.members,
      _count: undefined,
    }));

    return listResponse(formattedWorkspaces, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return errorResponse('Failed to fetch workspaces', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const parseResult = await parseJsonBody<unknown>(request);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const validationResult = createWorkspaceSchema.safeParse(parseResult.data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join('; ');
      return errors.badRequest(`Input validation failed: ${errorMessages}`);
    }

    const { description, isPersonal = false } = validationResult.data;
    const name =
      validationResult.data.name ??
      (isPersonal ? buildPersonalWorkspaceName(session.user.name, session.user.email) : '');

    if (!name) {
      return errors.badRequest('Workspace name is required');
    }

    if (isPersonal) {
      const existingPersonalWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: session.user.id,
          isPersonal: true,
        },
        select: { id: true },
      });
      if (existingPersonalWorkspace) {
        return errors.conflict('Personal workspace already exists');
      }
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
        isPersonal,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: { projects: true, members: true },
        },
      },
    });

    return createdResponse({
      ...workspace,
      projectCount: workspace._count.projects,
      memberCount: workspace._count.members,
      _count: undefined,
    });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return errorResponse('Failed to create workspace', 500);
  }
}

