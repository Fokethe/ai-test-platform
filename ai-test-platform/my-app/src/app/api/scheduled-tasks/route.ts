import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// 验证 Cron 表达式
function validateCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  
  const patterns = [
    /^[\*0-9,-\/]+$/,  // minute
    /^[\*0-9,-\/]+$/,  // hour
    /^[\*0-9,?L,-\/]+$/, // day of month
    /^[\*0-9,-\/]+$/,  // month
    /^[\*0-9,?L,-\/]+$/, // day of week
  ];
  
  return parts.every((part, index) => patterns[index].test(part));
}

// GET /api/scheduled-tasks - 获取定时任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const tasks = await prisma.scheduledTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const parsedTasks = tasks.map(task => ({
      ...task,
      testCaseIds: JSON.parse(task.testCaseIds || '[]'),
      notifications: task.notifications ? JSON.parse(task.notifications) : null,
    }));

    return NextResponse.json({ data: parsedTasks });
  } catch (error) {
    console.error('Failed to fetch scheduled tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled tasks' },
      { status: 500 }
    );
  }
}

// POST /api/scheduled-tasks - 创建定时任务
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, cron, testCaseIds, config, notifications } = body;

    if (!name || !cron || !testCaseIds || testCaseIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!validateCron(cron)) {
      return NextResponse.json(
        { error: 'Invalid cron expression' },
        { status: 400 }
      );
    }

    const nextRunAt = calculateNextRun(cron);

    const task = await prisma.scheduledTask.create({
      data: {
        name,
        description,
        cron,
        testCaseIds: JSON.stringify(testCaseIds),
        config: config ? JSON.stringify(config) : null,
        notifications: notifications ? JSON.stringify(notifications) : null,
        isActive: true,
        nextRunAt,
      },
    });

    revalidatePath('/scheduled-tasks');
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled task' },
      { status: 500 }
    );
  }
}

function calculateNextRun(cron: string): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000);
}
