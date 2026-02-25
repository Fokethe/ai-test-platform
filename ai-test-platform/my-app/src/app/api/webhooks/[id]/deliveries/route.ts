import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/webhooks/[id]/deliveries - 获取 Webhook 投递记录
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId: params.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.webhookDelivery.count({ where: { webhookId: params.id } })
    ]);

    const parsedDeliveries = deliveries.map(d => ({
      ...d,
      payload: JSON.parse(d.payload)
    }));

    return NextResponse.json({
      data: parsedDeliveries,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}
