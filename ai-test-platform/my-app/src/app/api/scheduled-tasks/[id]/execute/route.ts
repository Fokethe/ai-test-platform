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

    const testCaseIds = JSON.parse(task.testCaseIds || '[]');
    if (testCaseIds.length === 0) {
      return NextResponse.json(
        { error: 'No test cases assigned' },
        { status: 400 }
      );
    }

    const testRun = await prisma.testRun.create({
      data: {
        name: `${task.name} - 手动触发`,
        status: 'PENDING',
        totalCount: testCaseIds.length,
        createdBy: session.user.id,
      },
    });

    for (const testCaseId of testCaseIds) {
      await prisma.testExecution.create({
        data: {
          testCaseId,
          runId: testRun.id,
          status: 'PENDING',
        },
      });
    }

    await prisma.scheduledTask.update({
      where: { id: params.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(task.cron),
      },
    });

    return NextResponse.json({
      data: {
        testRunId: testRun.id,
        message: 'Task execution started',
      },
    });
  } catch (error) {
    console.error('Failed to execute scheduled task:', error);
    return NextResponse.json(
      { error: 'Failed to execute scheduled task' },
      { status: 500 }
    );
  }
}

function calculateNextRun(cron: string): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000);
}
