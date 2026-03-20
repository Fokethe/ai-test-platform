import { NextRequest, NextResponse } from 'next/server';
import { DeliveryStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { buildMeta, errors } from '@/lib/api-response';
import { buildQueryParams } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_DELIVERY_STATUSES: DeliveryStatus[] = [
  'PENDING',
  'DELIVERED',
  'FAILED',
  'RETRYING',
];

function parseDateInput(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseStatusInput(value: string | null): DeliveryStatus | null {
  if (!value) {
    return null;
  }
  const normalized = value.toUpperCase() as DeliveryStatus;
  if (!ALLOWED_DELIVERY_STATUSES.includes(normalized)) {
    return null;
  }
  return normalized;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errors.unauthorized();
    }

    const { id } = await context.params;
    if (!id) {
      return errors.badRequest('integration id is required');
    }

    const integration = await prisma.integration.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!integration) {
      return errors.notFound('integration');
    }

    const { searchParams } = new URL(request.url);
    const statusValue = searchParams.get('status');
    const parsedStatus = parseStatusInput(statusValue);
    if (statusValue && !parsedStatus) {
      return errors.badRequest('invalid delivery status');
    }

    const eventFilter = searchParams.get('event')?.trim();
    const fromDateInput = searchParams.get('from');
    const toDateInput = searchParams.get('to');
    const fromDate = parseDateInput(fromDateInput);
    const toDate = parseDateInput(toDateInput);
    if ((fromDateInput && !fromDate) || (toDateInput && !toDate)) {
      return errors.badRequest('invalid from/to date');
    }

    const failedOnly = searchParams.get('failedOnly') === 'true';
    const { page, pageSize, skip, take } = buildQueryParams(searchParams);

    const summaryWhere: Record<string, unknown> = {
      integrationId: id,
    };
    if (eventFilter) {
      summaryWhere.event = { contains: eventFilter };
    }
    if (fromDate || toDate) {
      summaryWhere.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    const listWhere: Record<string, unknown> = {
      ...summaryWhere,
    };
    if (failedOnly) {
      listWhere.status = 'FAILED';
    } else if (parsedStatus) {
      listWhere.status = parsedStatus;
    }

    const [
      listTotal,
      deliveries,
      totalInPeriod,
      deliveredCount,
      failedCount,
      retryingCount,
      failedSamples,
    ] = await Promise.all([
      prisma.delivery.count({ where: listWhere }),
      prisma.delivery.findMany({
        where: listWhere,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.delivery.count({ where: summaryWhere }),
      prisma.delivery.count({ where: { ...summaryWhere, status: 'DELIVERED' } }),
      prisma.delivery.count({ where: { ...summaryWhere, status: 'FAILED' } }),
      prisma.delivery.count({ where: { ...summaryWhere, status: 'RETRYING' } }),
      prisma.delivery.findMany({
        where: { ...summaryWhere, status: 'FAILED' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          event: true,
          attempts: true,
          error: true,
          responseStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const successRate =
      totalInPeriod > 0 ? Number(((deliveredCount / totalInPeriod) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        list: deliveries,
        pagination: buildMeta(listTotal, page, pageSize),
        summary: {
          total: totalInPeriod,
          delivered: deliveredCount,
          failed: failedCount,
          retrying: retryingCount,
          successRate,
        },
        failedSamples,
      },
    });
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    return errors.internalError();
  }
}
