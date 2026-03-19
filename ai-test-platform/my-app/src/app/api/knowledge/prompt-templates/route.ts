import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  getActivePromptTemplates,
  listPromptTemplateVersions,
  rollbackPromptTemplateVersion,
  savePromptTemplateVersion,
} from '@/lib/ai/rag/semantic-routing';

const updateSchema = z.object({
  projectId: z.string().optional(),
  scenario: z.string().min(1),
  name: z.string().min(1),
  template: z.string().min(1),
  keywords: z.array(z.string()).optional(),
});

const rollbackSchema = z.object({
  projectId: z.string().optional(),
  scenario: z.string().min(1),
  rollbackToVersion: z.number().int().min(1),
});

function normalizeProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  const trimmed = projectId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeProjectId(searchParams.get('projectId') || undefined);
  const scenario = searchParams.get('scenario')?.trim().toLowerCase();

  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const templates = await getActivePromptTemplates(projectId);
  const versions = await listPromptTemplateVersions({
    projectId,
    scenario,
  });

  const filteredTemplates = scenario
    ? templates.filter((item) => item.scenario === scenario)
    : templates;

  return successResponse({
    projectId: projectId || null,
    scenario: scenario || null,
    activeTemplates: filteredTemplates,
    versions,
  });
}

export async function PUT(request: NextRequest) {
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const projectId = normalizeProjectId(parsed.data.projectId);
  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const saved = await savePromptTemplateVersion({
    actorId: session.user.id,
    projectId,
    scenario: parsed.data.scenario,
    name: parsed.data.name,
    template: parsed.data.template,
    keywords: parsed.data.keywords || [],
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_PROMPT_TEMPLATE_UPDATED',
    target: 'RAG_PROMPT_TEMPLATE',
    targetId: saved.id,
    projectId: saved.projectId || undefined,
    metadata: {
      scenario: saved.scenario,
      version: saved.version,
      name: saved.name,
    },
  });

  return successResponse(
    {
      templateId: saved.id,
      projectId: saved.projectId || null,
      scenario: saved.scenario,
      version: saved.version,
      name: saved.name,
      template: saved.template,
      keywords: JSON.parse(saved.keywords),
    },
    'Prompt template updated'
  );
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

  const parsed = rollbackSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const projectId = normalizeProjectId(parsed.data.projectId);
  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const rollbackResult = await rollbackPromptTemplateVersion({
    actorId: session.user.id,
    projectId,
    scenario: parsed.data.scenario,
    rollbackToVersion: parsed.data.rollbackToVersion,
  });
  if (!rollbackResult) {
    return errors.notFound('Prompt template version');
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_PROMPT_TEMPLATE_ROLLBACK',
    target: 'RAG_PROMPT_TEMPLATE',
    targetId: rollbackResult.saved.id,
    projectId: rollbackResult.saved.projectId || undefined,
    metadata: {
      scenario: rollbackResult.saved.scenario,
      rollbackFromVersion: rollbackResult.rollbackFromVersion,
      newVersion: rollbackResult.saved.version,
    },
  });

  return successResponse({
    templateId: rollbackResult.saved.id,
    projectId: rollbackResult.saved.projectId || null,
    scenario: rollbackResult.saved.scenario,
    version: rollbackResult.saved.version,
    rollbackFromVersion: rollbackResult.rollbackFromVersion,
  });
}
