import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/webhooks/[id] - 获取单个 Webhook
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhook = await prisma.webhook.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { deliveries: true } }
      }
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      data: { ...webhook, secret: '********' } 
    });
  } catch (error) {
    console.error('Failed to fetch webhook:', error);
    return NextResponse.json({ error: 'Failed to fetch webhook' }, { status: 500 });
  }
}

// PUT /api/webhooks/[id] - 更新 Webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, isActive, config } = body;

    const webhook = await prisma.webhook.update({
      where: { id: params.id },
      data: {
        name,
        isActive,
        config: config !== undefined ? (config ? JSON.stringify(config) : null) : undefined
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ data: webhook });
  } catch (error) {
    console.error('Failed to update webhook:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// DELETE /api/webhooks/[id] - 删除 Webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.webhook.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
