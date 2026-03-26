import { RequirementSource } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const BRIDGE_SYSTEM_BASE_URL = 'ai://requirements';
const BRIDGE_SYSTEM_NAME = 'AI Requirement Bridge';
const BRIDGE_PAGE_PATH = '/ai-requirements';
const BRIDGE_PAGE_NAME = 'AI Requirements';
const PROJECT_DEFAULT_REQUIREMENT_SOURCE = 'bridge://project/default-requirement';

export type EnsureAiBridgeInput = {
  aiRequirementId: string;
  projectId: string;
  title?: string;
  description?: string | null;
};

export type ResolveLegacyRequirementInput = {
  projectId: string;
  requirementId?: string | null;
};

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  return value.trim();
}

async function ensureBridgePage(projectId: string) {
  let system = await prisma.system.findFirst({
    where: {
      projectId,
      baseUrl: BRIDGE_SYSTEM_BASE_URL,
    },
    select: { id: true },
  });

  if (!system) {
    system = await prisma.system.create({
      data: {
        projectId,
        name: BRIDGE_SYSTEM_NAME,
        baseUrl: BRIDGE_SYSTEM_BASE_URL,
      },
      select: { id: true },
    });
  }

  let page = await prisma.page.findFirst({
    where: {
      systemId: system.id,
      path: BRIDGE_PAGE_PATH,
    },
    select: { id: true },
  });

  if (!page) {
    page = await prisma.page.create({
      data: {
        systemId: system.id,
        name: BRIDGE_PAGE_NAME,
        path: BRIDGE_PAGE_PATH,
      },
      select: { id: true },
    });
  }

  return page.id;
}

export async function ensureLegacyRequirementForAiRequirement(
  input: EnsureAiBridgeInput
): Promise<string> {
  const sourceUrl = `ai://requirement/${input.aiRequirementId}`;
  const existing = await prisma.requirement.findFirst({
    where: {
      sourceUrl,
      page: {
        system: {
          projectId: input.projectId,
        },
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const pageId = await ensureBridgePage(input.projectId);
  const title = normalizeText(input.title) || `AI Requirement ${input.aiRequirementId.slice(0, 8)}`;
  const description = normalizeText(input.description) || null;

  const created = await prisma.requirement.create({
    data: {
      pageId,
      title,
      description,
      sourceType: RequirementSource.PASTE,
      sourceUrl,
      rawContent: description,
      parsedData: JSON.stringify({
        aiRequirementId: input.aiRequirementId,
        bridgedAt: new Date().toISOString(),
      }),
    },
    select: { id: true },
  });

  return created.id;
}

export async function ensureProjectDefaultLegacyRequirement(
  projectId: string,
  title = '默认测试需求'
): Promise<string> {
  const sourceUrl = `${PROJECT_DEFAULT_REQUIREMENT_SOURCE}/${projectId}`;
  const existing = await prisma.requirement.findFirst({
    where: {
      sourceUrl,
      page: {
        system: {
          projectId,
        },
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const pageId = await ensureBridgePage(projectId);
  const created = await prisma.requirement.create({
    data: {
      pageId,
      title: normalizeText(title) || '默认测试需求',
      description: '系统自动创建的兼容需求，用于承载 AI/批量导入测试用例。',
      sourceType: RequirementSource.PASTE,
      sourceUrl,
      rawContent: null,
      parsedData: JSON.stringify({
        type: 'project-default-requirement',
        projectId,
        createdAt: new Date().toISOString(),
      }),
    },
    select: { id: true },
  });

  return created.id;
}

export async function resolveLegacyRequirementId(
  input: ResolveLegacyRequirementInput
): Promise<string | null> {
  const requirementId = normalizeText(input.requirementId);
  if (!requirementId) {
    return null;
  }

  const legacyRequirement = await prisma.requirement.findFirst({
    where: {
      id: requirementId,
      page: {
        system: {
          projectId: input.projectId,
        },
      },
    },
    select: { id: true },
  });

  if (legacyRequirement) {
    return legacyRequirement.id;
  }

  const aiRequirement = await prisma.aiRequirement.findFirst({
    where: {
      id: requirementId,
      projectId: input.projectId,
    },
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  if (!aiRequirement) {
    return null;
  }

  return ensureLegacyRequirementForAiRequirement({
    aiRequirementId: aiRequirement.id,
    projectId: input.projectId,
    title: aiRequirement.title,
    description: aiRequirement.content,
  });
}

