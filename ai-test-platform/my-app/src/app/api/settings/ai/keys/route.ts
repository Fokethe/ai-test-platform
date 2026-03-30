import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { decryptText, encryptText } from '@/lib/security/simple-crypto';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  key: z.string().trim().min(8).max(500),
  provider: z.string().trim().min(1).max(40),
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

type ApiKeyRow = {
  id: string;
  name: string;
  key: string;
  provider: string;
  isActive: boolean;
  createdAt: Date;
};

type CallStatRow = {
  apiKeyId: string | null;
  totalTokens: number;
  estimatedCost: number;
  createdAt: Date;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().toLowerCase() || '';
  const provider = searchParams.get('provider')?.trim().toLowerCase() || '';
  const status = searchParams.get('status')?.trim().toLowerCase() || '';

  const rows = ((await (prisma as any).apiKey.findMany({
    where: {
      userId: session.user.id,
      ...(provider && provider !== 'all' ? { provider } : {}),
      ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })) || []) as ApiKeyRow[];

  const filteredRows = q
    ? rows.filter((row) => row.name.toLowerCase().includes(q) || row.provider.toLowerCase().includes(q))
    : rows;

  const ids = filteredRows.map((row) => row.id);
  const statModel = (prisma as any).aiModelCallStat;
  const usageRows = statModel?.findMany
    ? (((await statModel.findMany({
        where: {
          userId: session.user.id,
          apiKeyId: { in: ids },
        },
        select: {
          apiKeyId: true,
          totalTokens: true,
          estimatedCost: true,
          createdAt: true,
        },
      })) || []) as CallStatRow[])
    : [];

  const usageMap = new Map<
    string,
    {
      calls: number;
      totalTokens: number;
      totalCost: number;
      lastUsedAt?: string;
    }
  >();

  usageRows.forEach((row) => {
    if (!row.apiKeyId) {
      return;
    }
    const existing = usageMap.get(row.apiKeyId) || {
      calls: 0,
      totalTokens: 0,
      totalCost: 0,
    };
    existing.calls += 1;
    existing.totalTokens += Number(row.totalTokens || 0);
    existing.totalCost += Number(row.estimatedCost || 0);
    if (!existing.lastUsedAt || new Date(existing.lastUsedAt) < row.createdAt) {
      existing.lastUsedAt = row.createdAt.toISOString();
    }
    usageMap.set(row.apiKeyId, existing);
  });

  const list = filteredRows.map((row) => {
    let masked = '******';
    try {
      masked = maskKey(decryptText(row.key));
    } catch {
      masked = '******';
    }
    const usage = usageMap.get(row.id) || {
      calls: 0,
      totalTokens: 0,
      totalCost: 0,
      lastUsedAt: undefined,
    };
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      isActive: row.isActive,
      maskedKey: masked,
      createdAt: row.createdAt.toISOString(),
      usage: {
        calls: usage.calls,
        totalTokens: usage.totalTokens,
        totalCost: Number(usage.totalCost.toFixed(6)),
        lastUsedAt: usage.lastUsedAt,
      },
    };
  });

  const summary = {
    total: list.length,
    active: list.filter((item) => item.isActive).length,
    quotaLimited: 0,
    attentionNeeded: 0,
  };

  return successResponse({ list, summary });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errors.badRequest(parsed.error.issues[0]?.message || 'Invalid payload');
  }

  const created = await (prisma as any).apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      provider: parsed.data.provider,
      key: encryptText(parsed.data.key),
      isActive: parsed.data.isActive ?? true,
    },
  });

  return successResponse({
    id: created.id,
    name: created.name,
    provider: created.provider,
    isActive: created.isActive,
    maskedKey: maskKey(parsed.data.key),
    createdAt: created.createdAt.toISOString(),
  });
}
