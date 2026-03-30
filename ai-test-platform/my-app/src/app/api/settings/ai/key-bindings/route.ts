import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const SUPPORTED_MODELS = ['gpt-5.3', 'gpt-5.4', 'claude-3-7-sonnet', 'kimi-k2.5'] as const;
type SupportedModel = (typeof SUPPORTED_MODELS)[number];

type BindingRow = {
  id: string;
  model: string;
  apiKeyId: string;
  apiKey: {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
  };
};

function normalizeBindings(input: unknown): Partial<Record<SupportedModel, string | null>> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const raw = input as Record<string, unknown>;
  const result: Partial<Record<SupportedModel, string | null>> = {};
  SUPPORTED_MODELS.forEach((model) => {
    const value = raw[model];
    if (value === null) {
      result[model] = null;
      return;
    }
    if (typeof value === 'string' && value.trim()) {
      result[model] = value.trim();
    }
  });
  return result;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const bindingModel = (prisma as any).userModelApiKeyBinding;
  if (!bindingModel?.findMany) {
    return successResponse({
      supportedModels: SUPPORTED_MODELS,
      bindings: SUPPORTED_MODELS.map((model) => ({
        model,
        apiKeyId: null,
      })),
    });
  }

  const rows = (await bindingModel.findMany({
    where: {
      userId: session.user.id,
      model: { in: [...SUPPORTED_MODELS] },
    },
    include: {
      apiKey: {
        select: {
          id: true,
          name: true,
          provider: true,
          isActive: true,
        },
      },
    },
  })) as BindingRow[];

  const map = new Map(rows.map((row) => [row.model, row]));
  return successResponse({
    supportedModels: SUPPORTED_MODELS,
    bindings: SUPPORTED_MODELS.map((model) => {
      const row = map.get(model);
      return {
        model,
        apiKeyId: row?.apiKeyId || null,
        apiKeyName: row?.apiKey?.name || null,
        provider: row?.apiKey?.provider || null,
        isActive: row?.apiKey?.isActive ?? null,
      };
    }),
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const bindingModel = (prisma as any).userModelApiKeyBinding;
  if (!bindingModel?.findMany) {
    return errors.badRequest('Binding model is unavailable');
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const bindings = normalizeBindings((body as { bindings?: unknown })?.bindings);

  const apiKeyIds = Object.values(bindings).filter((value): value is string => typeof value === 'string');
  if (apiKeyIds.length > 0) {
    const ownedKeys = await (prisma as any).apiKey.findMany({
      where: {
        id: { in: apiKeyIds },
        userId: session.user.id,
      },
      select: { id: true },
    });
    if (ownedKeys.length !== new Set(apiKeyIds).size) {
      return errors.badRequest('Some API keys are invalid or not owned by current user');
    }
  }

  const operations = SUPPORTED_MODELS.map(async (model) => {
    const keyId = bindings[model];
    if (keyId === null) {
      await bindingModel.deleteMany({
        where: {
          userId: session.user.id,
          model,
        },
      });
      return;
    }
    if (typeof keyId === 'string' && keyId) {
      await bindingModel.upsert({
        where: {
          userId_model: {
            userId: session.user.id,
            model,
          },
        },
        update: {
          apiKeyId: keyId,
        },
        create: {
          userId: session.user.id,
          model,
          apiKeyId: keyId,
        },
      });
    }
  });

  await Promise.all(operations);

  const rows = (await bindingModel.findMany({
    where: {
      userId: session.user.id,
      model: { in: [...SUPPORTED_MODELS] },
    },
    include: {
      apiKey: {
        select: {
          id: true,
          name: true,
          provider: true,
          isActive: true,
        },
      },
    },
  })) as BindingRow[];

  const map = new Map(rows.map((row) => [row.model, row]));
  return successResponse({
    supportedModels: SUPPORTED_MODELS,
    bindings: SUPPORTED_MODELS.map((model) => {
      const row = map.get(model);
      return {
        model,
        apiKeyId: row?.apiKeyId || null,
        apiKeyName: row?.apiKey?.name || null,
        provider: row?.apiKey?.provider || null,
        isActive: row?.apiKey?.isActive ?? null,
      };
    }),
  });
}
