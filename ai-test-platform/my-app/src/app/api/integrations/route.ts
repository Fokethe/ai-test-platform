import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  buildMeta,
  createdResponse,
  errorResponse,
  errors,
  listResponse,
} from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const DEFAULT_INTEGRATION_EVENTS = ['run.completed', 'issue.created'];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeEventsInput(value: unknown): string[] | null {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_INTEGRATION_EVENTS;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item).trim().toLowerCase())
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return DEFAULT_INTEGRATION_EVENTS;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((item) => String(item).trim().toLowerCase())
          .filter((item) => item.length > 0);
        return normalized.length > 0 ? normalized : null;
      }
    } catch {
      const normalized = trimmed
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0);
      return normalized.length > 0 ? normalized : null;
    }
  }

  return null;
}

function normalizeConfigInput(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const type = searchParams.get('type') || undefined;
    const isActive = searchParams.get('isActive');
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 100);

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }
    if (type) {
      where.type = type;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const total = await prisma.integration.count({ where });
    const integrations = await prisma.integration.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    return listResponse(integrations, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error('Failed to fetch integrations:', error);
    return errorResponse('Failed to fetch integrations', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const type = typeof body?.type === 'string' ? body.type.trim() : '';
    const provider =
      typeof body?.provider === 'string' && body.provider.trim().length > 0
        ? body.provider.trim()
        : type;
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    const secret = typeof body?.secret === 'string' ? body.secret : null;
    const token = typeof body?.token === 'string' ? body.token : null;
    const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';
    const events = normalizeEventsInput(body?.events);
    const config = normalizeConfigInput(body?.config);

    if (!name || !type || !url || !projectId) {
      return errors.badRequest('name, type, url and projectId are required');
    }
    if (!events) {
      return errors.badRequest('events must be a non-empty list');
    }

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        provider,
        url,
        secret,
        token,
        events: JSON.stringify(events),
        config,
        projectId,
        createdBy: session.user.id,
        isActive: true,
      },
    });

    return createdResponse(integration);
  } catch (error) {
    console.error('Failed to create integration:', error);
    return errorResponse('Failed to create integration', 500);
  }
}
