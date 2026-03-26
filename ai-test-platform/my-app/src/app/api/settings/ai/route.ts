import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { decryptText, encryptText } from '@/lib/security/simple-crypto';

const DEFAULT_AI_SETTINGS = {
  enableAI: true,
  autoGenerate: false,
  smartAnalysis: true,
  model: 'gpt-4o',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

type UpdatePayload = Partial<{
  enableAI: unknown;
  autoGenerate: unknown;
  smartAnalysis: unknown;
  model: unknown;
  apiKey: unknown;
  temperature: unknown;
  maxTokens: unknown;
  topP: unknown;
  frequencyPenalty: unknown;
  presencePenalty: unknown;
}>;

const ALLOWED_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-7-sonnet',
  'kimi-k2.5',
]);

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const record = await prisma.userAiSetting.findUnique({
    where: { userId: session.user.id },
  });

  if (!record) {
    return successResponse(DEFAULT_AI_SETTINGS);
  }

  let apiKey = '';
  if (record.apiKeyEncrypted) {
    try {
      apiKey = decryptText(record.apiKeyEncrypted);
    } catch {
      apiKey = '';
    }
  }

  return successResponse({
    enableAI: record.enableAI,
    autoGenerate: record.autoGenerate,
    smartAnalysis: record.smartAnalysis,
    model: record.model,
    apiKey,
    temperature: record.temperature,
    maxTokens: record.maxTokens,
    topP: record.topP,
    frequencyPenalty: record.frequencyPenalty,
    presencePenalty: record.presencePenalty,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const model =
    typeof body.model === 'string' && ALLOWED_MODELS.has(body.model)
      ? body.model
      : DEFAULT_AI_SETTINGS.model;

  const apiKey =
    typeof body.apiKey === 'string' ? body.apiKey.trim() : DEFAULT_AI_SETTINGS.apiKey;

  const data = {
    enableAI: typeof body.enableAI === 'boolean' ? body.enableAI : DEFAULT_AI_SETTINGS.enableAI,
    autoGenerate:
      typeof body.autoGenerate === 'boolean' ? body.autoGenerate : DEFAULT_AI_SETTINGS.autoGenerate,
    smartAnalysis:
      typeof body.smartAnalysis === 'boolean' ? body.smartAnalysis : DEFAULT_AI_SETTINGS.smartAnalysis,
    model,
    apiKeyEncrypted: apiKey ? encryptText(apiKey) : null,
    temperature: Math.max(0, Math.min(2, toNumber(body.temperature, DEFAULT_AI_SETTINGS.temperature))),
    maxTokens: Math.max(100, Math.min(32000, Math.floor(toNumber(body.maxTokens, DEFAULT_AI_SETTINGS.maxTokens)))),
    topP: Math.max(0, Math.min(1, toNumber(body.topP, DEFAULT_AI_SETTINGS.topP))),
    frequencyPenalty: Math.max(-2, Math.min(2, toNumber(body.frequencyPenalty, DEFAULT_AI_SETTINGS.frequencyPenalty))),
    presencePenalty: Math.max(-2, Math.min(2, toNumber(body.presencePenalty, DEFAULT_AI_SETTINGS.presencePenalty))),
  };

  await prisma.userAiSetting.upsert({
    where: { userId: session.user.id },
    update: data,
    create: {
      userId: session.user.id,
      ...data,
    },
  });

  return successResponse(
    {
      ...data,
      apiKey,
    },
    'AI settings saved'
  );
}
