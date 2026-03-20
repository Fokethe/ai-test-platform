import type { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

type DemoContext = {
  userId: string;
  workspaceId: string;
  projectId: string;
};

type TestFixture = DemoContext & {
  testId: string;
};

export async function ensureDemoContext(prisma: PrismaClient): Promise<DemoContext> {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Demo User',
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
  }

  let workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'E2E Workspace',
        description: 'Auto-created for E2E tests',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
      select: { id: true },
    });
  } else {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!member) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
    }
  }

  let project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'E2E Project',
        description: 'Auto-created for E2E tests',
        workspaceId: workspace.id,
      },
      select: { id: true },
    });
  }

  return {
    userId: user.id,
    workspaceId: workspace.id,
    projectId: project.id,
  };
}

export async function ensureTestFixture(
  prisma: PrismaClient,
  options: {
    testName: string;
    projectId?: string;
  }
): Promise<TestFixture> {
  const demo = await ensureDemoContext(prisma);
  const projectId = options.projectId ?? demo.projectId;

  let system = await prisma.system.findFirst({
    where: { projectId },
    select: { id: true },
  });

  if (!system) {
    system = await prisma.system.create({
      data: {
        name: 'E2E System',
        baseUrl: 'https://example.com',
        projectId,
      },
      select: { id: true },
    });
  }

  let page = await prisma.page.findFirst({
    where: { systemId: system.id },
    select: { id: true },
  });

  if (!page) {
    page = await prisma.page.create({
      data: {
        name: 'E2E Page',
        path: '/e2e-page',
        systemId: system.id,
      },
      select: { id: true },
    });
  }

  let requirement = await prisma.requirement.findFirst({
    where: { pageId: page.id },
    select: { id: true },
  });

  if (!requirement) {
    requirement = await prisma.requirement.create({
      data: {
        title: 'E2E Requirement',
        description: 'Requirement for E2E tests',
        sourceType: 'PASTE',
        pageId: page.id,
      },
      select: { id: true },
    });
  }

  let smokeTest = await prisma.test.findFirst({
    where: {
      projectId,
      name: options.testName,
    },
    select: { id: true },
  });

  if (!smokeTest) {
    smokeTest = await prisma.test.create({
      data: {
        name: options.testName,
        description: `Auto-created: ${options.testName}`,
        type: 'CASE',
        status: 'ACTIVE',
        content: JSON.stringify([{ step: 1, action: 'open page', expected: 'ok' }]),
        projectId,
        priority: 'MEDIUM',
        source: 'MANUAL',
        requirementId: requirement.id,
        createdBy: demo.userId,
      },
      select: { id: true },
    });
  }

  return {
    ...demo,
    projectId,
    testId: smokeTest.id,
  };
}

export async function gotoWithRetry(
  page: Page,
  url: string,
  retries = 2
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isLast = attempt === retries;
      if (!message.includes('ERR_ABORTED') || isLast) {
        throw error;
      }
      await page.waitForTimeout(300);
    }
  }
}
