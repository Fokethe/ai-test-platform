import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

// GET /api/webhooks - 获取 Webhook 列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const webhooks = await prisma.webhook.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { deliveries: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 隐藏 secret
    const sanitizedWebhooks = webhooks.map(w => ({
      ...w,
      secret: '********'
    }));

    return NextResponse.json({ data: sanitizedWebhooks });
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// POST /api/webhooks - 创建 Webhook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, provider, projectId, config } = body;

    if (!name || !provider || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 生成 webhook URL path 和 secret
    const url = `wh_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        name,
        provider,
        url,
        secret,
        projectId,
        config: config ? JSON.stringify(config) : null,
        isActive: true
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ 
      data: { ...webhook, secret } 
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
