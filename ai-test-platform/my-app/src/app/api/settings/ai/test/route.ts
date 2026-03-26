import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { decryptText } from '@/lib/security/simple-crypto';

function inferProvider(apiKey: string) {
  if (apiKey.startsWith('sk-')) {
    return 'openai-compatible';
  }
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  if (apiKey.startsWith('sk-kimi-') || apiKey.startsWith('moon-')) {
    return 'kimi';
  }
  return 'unknown';
}

async function tryRemoteValidation(apiKey: string) {
  if (process.env.AI_KEY_TEST_REMOTE !== 'true') {
    return { remoteChecked: false, reachable: null as boolean | null };
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    return {
      remoteChecked: true,
      reachable: response.ok,
    };
  } catch {
    return {
      remoteChecked: true,
      reachable: false,
    };
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: { apiKey?: unknown } = {};
  try {
    body = (await request.json()) as { apiKey?: unknown };
  } catch {
    body = {};
  }

  let apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!apiKey) {
    const stored = await prisma.userAiSetting.findUnique({
      where: { userId: session.user.id },
      select: { apiKeyEncrypted: true },
    });

    if (stored?.apiKeyEncrypted) {
      try {
        apiKey = decryptText(stored.apiKeyEncrypted);
      } catch {
        apiKey = '';
      }
    }
  }

  if (!apiKey) {
    return errors.badRequest('API key is required');
  }

  const formatValid = apiKey.length >= 12;
  const provider = inferProvider(apiKey);
  const remote = await tryRemoteValidation(apiKey);
  const success = formatValid && (remote.remoteChecked ? remote.reachable !== false : true);

  if (!success) {
    return errors.badRequest('API key validation failed');
  }

  return successResponse({
    valid: true,
    provider,
    remoteChecked: remote.remoteChecked,
    reachable: remote.reachable,
  });
}
