import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...task,
        testCaseIds: JSON.parse(task.testCaseIds || '[]'),
        notifications: task.notifications ? JSON.parse(task.notifications) : null,
        config: task.config ? JSON.parse(task.config) : null,
      },
    });
  } catch (error) {
    console.error('Failed to fetch scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled task' },
      { status: 500 }
    );
  }
}

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
    const { name, description, cron, testCaseIds, config, notifications, isActive } = body;

    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let nextRunAt = existingTask.nextRunAt;
    if (cron && cron !== existingTask.cron) {
      nextRunAt = calculateNextRun(cron);
    }

    const task = await prisma.scheduledTask.update({
      where: { id: params.id },
      data: {
        name,
        description,
        cron,
        testCaseIds: testCaseIds ? JSON.stringify(testCaseIds) : undefined,
        config: config !== undefined ? (config ? JSON.stringify(config) : null) : undefined,
        notifications: notifications !== undefined ? (notifications ? JSON.stringify(notifications) : null) : undefined,
        isActive,
        nextRunAt,
      },
    });

    revalidatePath('/scheduled-tasks');
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to update scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.scheduledTask.delete({ where: { id: params.id } });
    revalidatePath('/scheduled-tasks');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled task' },
      { status: 500 }
    );
  }
}

function calculateNextRun(cron: string): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000);
}
