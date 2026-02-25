import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// 验证签名
function verifySignature(payload: string, signature: string, secret: string, provider: string): boolean {
  try {
    if (provider === 'github') {
      // GitHub: sha256=xxx
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return signature === `sha256=${expected}`;
    } else if (provider === 'gitlab') {
      // GitLab: sha256=xxx
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return signature === expected;
    } else if (provider === 'jenkins') {
      // Jenkins: 自定义 header
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return signature === expected;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// 解析事件类型
function getEventType(headers: Headers, provider: string): string {
  if (provider === 'github') {
    return headers.get('x-github-event') || 'push';
  } else if (provider === 'gitlab') {
    return headers.get('x-gitlab-event') || 'Push Hook';
  }
  return 'push';
}

// 处理 Webhook 请求
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const urlPath = params.path?.join('/') || '';
    
    // 查找对应的 webhook
    const webhook = await prisma.webhook.findFirst({
      where: { url: urlPath, isActive: true },
      include: { project: true }
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // 读取原始 body
    const payload = await request.text();
    const headers = request.headers;

    // 获取签名
    let signature = '';
    if (webhook.provider === 'github') {
      signature = headers.get('x-hub-signature-256') || '';
    } else if (webhook.provider === 'gitlab') {
      signature = headers.get('x-gitlab-token') || '';
    } else if (webhook.provider === 'jenkins') {
      signature = headers.get('x-jenkins-signature') || '';
    }

    // 验证签名（如果配置了 secret）
    if (webhook.secret && !verifySignature(payload, signature, webhook.secret, webhook.provider)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = getEventType(headers, webhook.provider);
    const data = JSON.parse(payload);

    // 解析提交信息
    let branch = 'main';
    let commitMessage = '';
    let committer = '';

    if (webhook.provider === 'github') {
      branch = data.ref?.replace('refs/heads/', '') || 'main';
      commitMessage = data.head_commit?.message || '';
      committer = data.head_commit?.committer?.name || '';
    } else if (webhook.provider === 'gitlab') {
      branch = data.ref?.replace('refs/heads/', '') || 'main';
      commitMessage = data.commits?.[0]?.message || '';
      committer = data.user_name || '';
    }

    // 获取配置
    const config = webhook.config ? JSON.parse(webhook.config) : {};
    const testCaseIds = config.testCaseIds || [];

    // 创建投递记录
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: JSON.stringify({ branch, commitMessage, committer, raw: data }),
        status: 'pending'
      }
    });

    // 创建测试运行
    let testRun = null;
    if (testCaseIds.length > 0) {
      testRun = await prisma.testRun.create({
        data: {
          name: `CI: ${branch} - ${commitMessage.slice(0, 50)}`,
          status: 'PENDING',
          totalCount: testCaseIds.length,
          createdBy: 'system'
        }
      });

      // 创建测试执行记录
      for (const testCaseId of testCaseIds) {
        await prisma.testExecution.create({
          data: {
            testCaseId,
            runId: testRun.id,
            status: 'PENDING'
          }
        });
      }

      // 更新投递记录
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { 
          status: 'success',
          testRunId: testRun.id,
          response: JSON.stringify({ testRunId: testRun.id, message: 'Test run created' })
        }
      });

      // 更新 webhook 最后触发时间
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date() }
      });
    } else {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { 
          status: 'success',
          response: JSON.stringify({ message: 'No test cases configured' })
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      deliveryId: delivery.id,
      testRunId: testRun?.id 
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// 支持所有 HTTP 方法
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Webhook endpoint ready' });
}
