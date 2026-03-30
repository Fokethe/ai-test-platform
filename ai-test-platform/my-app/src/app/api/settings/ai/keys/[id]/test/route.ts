import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { decryptText } from '@/lib/security/simple-crypto';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  void request;

  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await context.params;
  if (!id) {
    return errors.badRequest('key id is required');
  }

  const record = await (prisma as any).apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      provider: true,
      key: true,
    },
  });
  if (!record) {
    return errors.notFound('apiKey');
  }

  let rawKey = '';
  try {
    rawKey = decryptText(record.key);
  } catch {
    rawKey = '';
  }

  if (!rawKey) {
    return errors.badRequest('API key is invalid');
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${rawKey}`,
      },
      cache: 'no-store',
    });

    return successResponse({
      valid: response.ok,
      reachable: response.ok,
      status: response.status,
      provider: record.provider,
      baseUrl,
    });
  } catch (error) {
    return successResponse({
      valid: false,
      reachable: false,
      status: 0,
      provider: record.provider,
      baseUrl,
      error: error instanceof Error ? error.message : 'NETWORK_ERROR',
    });
  }
}
