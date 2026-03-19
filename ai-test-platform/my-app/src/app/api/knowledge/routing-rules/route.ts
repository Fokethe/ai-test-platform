import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { hasProjectAccess } from '@/lib/project-access';
import { writeAuditLog } from '@/lib/audit';
import {
  listRoutingRuleVersions,
  getLatestRoutingRuleSet,
  parseRoutingRules,
  rollbackRoutingRuleSet,
  saveRoutingRuleSet,
} from '@/lib/ai/rag/logic-routing';

const conditionSchema = z.object({
  field: z.enum(['query', 'departmentId', 'projectId']),
  operator: z.enum(['contains', 'equals', 'startsWith', 'regex']),
  value: z.string().min(1),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priority: z.number().int(),
  enabled: z.boolean(),
  mode: z.enum(['ALL', 'ANY']),
  conditions: z.array(conditionSchema),
  targetSources: z.array(z.enum(['relational', 'graph', 'vector'])).min(1),
  note: z.string().optional(),
});

const updateSchema = z.object({
  projectId: z.string().optional(),
  rules: z.array(ruleSchema),
});

const rollbackSchema = z.object({
  projectId: z.string().optional(),
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

  if (projectId) {
    const canAccessProject = await hasProjectAccess(session.user.id, projectId);
    if (!canAccessProject) {
      return errors.forbidden();
    }
  }

  const latest = await getLatestRoutingRuleSet(projectId);
  const versions = await listRoutingRuleVersions(projectId);
  const rules = latest ? parseRoutingRules(JSON.parse(latest.rulesJson)) : [];

  return successResponse({
    projectId: projectId || null,
    activeVersion: latest?.version ?? 0,
    rules,
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

  const normalizedRules = parseRoutingRules(parsed.data.rules);
  const saved = await saveRoutingRuleSet({
    actorId: session.user.id,
    projectId,
    rules: normalizedRules,
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_ROUTING_RULES_UPDATED',
    target: 'RAG_ROUTING_RULE_SET',
    targetId: saved.id,
    projectId: saved.projectId || undefined,
    metadata: {
      version: saved.version,
      ruleCount: normalizedRules.length,
    },
  });

  return successResponse(
    {
      ruleSetId: saved.id,
      projectId: saved.projectId || null,
      version: saved.version,
      rules: normalizedRules,
    },
    'Routing rules updated'
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

  const rollbackResult = await rollbackRoutingRuleSet({
    actorId: session.user.id,
    projectId,
    rollbackToVersion: parsed.data.rollbackToVersion,
  });

  if (!rollbackResult) {
    return errors.notFound('Routing rule version');
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: 'RAG_ROUTING_RULES_ROLLBACK',
    target: 'RAG_ROUTING_RULE_SET',
    targetId: rollbackResult.saved.id,
    projectId: rollbackResult.saved.projectId || undefined,
    metadata: {
      rollbackFromVersion: rollbackResult.rollbackFromVersion,
      newVersion: rollbackResult.saved.version,
    },
  });

  return successResponse({
    ruleSetId: rollbackResult.saved.id,
    projectId: rollbackResult.saved.projectId || null,
    version: rollbackResult.saved.version,
    rollbackFromVersion: rollbackResult.rollbackFromVersion,
  });
}
