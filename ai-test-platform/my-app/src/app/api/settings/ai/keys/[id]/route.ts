import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { decryptText, encryptText } from '@/lib/security/simple-crypto';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  key: z.string().trim().min(8).max(500).optional(),
  provider: z.string().trim().min(1).max(40).optional(),
  isActive: z.boolean().optional(),
});

function maskKey(rawKey: string) {
  const key = rawKey.trim();
  if (!key) {
    return '';
  }
  if (key.length <= 10) {
    return `${key.slice(0, 2)}***${key.slice(-2)}`;
  }
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await context.params;
  if (!id) {
    return errors.badRequest('key id is required');
  }

  const existing = await (prisma as any).apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });
  if (!existing) {
    return errors.notFound('apiKey');
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const data: Record<string, unknown> = {};
  if (typeof parsed.data.name === 'string') {
    data.name = parsed.data.name;
  }
  if (typeof parsed.data.provider === 'string') {
    data.provider = parsed.data.provider;
  }
  if (typeof parsed.data.isActive === 'boolean') {
    data.isActive = parsed.data.isActive;
  }
  if (typeof parsed.data.key === 'string') {
    data.key = encryptText(parsed.data.key);
  }

  const updated = await (prisma as any).apiKey.update({
    where: { id: existing.id },
    data,
  });

  let maskedKey = '******';
  try {
    maskedKey = maskKey(decryptText(updated.key));
  } catch {
    maskedKey = '******';
  }

  return successResponse({
    id: updated.id,
    name: updated.name,
    provider: updated.provider,
    isActive: updated.isActive,
    maskedKey,
    createdAt: updated.createdAt.toISOString(),
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  void request;

  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { id } = await context.params;
  if (!id) {
    return errors.badRequest('key id is required');
  }

  const existing = await (prisma as any).apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: { id: true },
  });
  if (!existing) {
    return errors.notFound('apiKey');
  }

  await (prisma as any).apiKey.delete({
    where: { id: existing.id },
  });

  return successResponse({
    id: existing.id,
    deleted: true,
  });
}
