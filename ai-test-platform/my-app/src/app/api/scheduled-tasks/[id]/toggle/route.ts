import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(
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

    const updatedTask = await prisma.scheduledTask.update({
      where: { id: params.id },
      data: {
        isActive: !task.isActive,
        nextRunAt: !task.isActive ? calculateNextRun(task.cron) : null,
      },
    });

    return NextResponse.json({
      data: {
        ...updatedTask,
        testCaseIds: JSON.parse(updatedTask.testCaseIds || '[]'),
      },
    });
  } catch (error) {
    console.error('Failed to toggle scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to toggle scheduled task' },
      { status: 500 }
    );
  }
}

function calculateNextRun(cron: string): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000);
}
