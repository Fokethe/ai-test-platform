import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function parseRange(value: string | null) {
  switch (value) {
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 7;
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseRange(searchParams.get('range'));
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  const start = startOfDay(startDate);

  const accessibleProjects = await prisma.project.findMany({
    where: {
      OR: [
        { members: { some: { userId: session.user.id } } },
        { workspace: { members: { some: { userId: session.user.id } } } },
        { workspace: { ownerId: session.user.id } },
      ],
    },
    select: { id: true, name: true },
  });

  const projectIds = accessibleProjects.map((item) => item.id);
  if (projectIds.length === 0) {
    return NextResponse.json({
      totalExecutions: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: 0,
      avgDuration: 0,
      executionsByDay: [],
      executionsByProject: [],
    });
  }

  const runs = await prisma.run.findMany({
    where: {
      projectId: { in: projectIds },
      createdAt: { gte: start },
    },
    select: {
      id: true,
      projectId: true,
      status: true,
      duration: true,
      createdAt: true,
    },
  });

  const totalExecutions = runs.length;
  const passedCount = runs.filter((run) => run.status === 'COMPLETED').length;
  const failedCount = runs.filter((run) => run.status === 'FAILED').length;
  const passRate = totalExecutions > 0 ? Math.round((passedCount / totalExecutions) * 100) : 0;
  const durations = runs.map((run) => run.duration || 0).filter((value) => value > 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0;

  const dateKeys = Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const byDayMap = new Map<string, { count: number; passed: number; failed: number }>();
  for (const key of dateKeys) {
    byDayMap.set(key, { count: 0, passed: 0, failed: 0 });
  }
  for (const run of runs) {
    const key = run.createdAt.toISOString().slice(0, 10);
    const slot = byDayMap.get(key);
    if (!slot) {
      continue;
    }
    slot.count += 1;
    if (run.status === 'COMPLETED') {
      slot.passed += 1;
    }
    if (run.status === 'FAILED') {
      slot.failed += 1;
    }
  }

  const executionsByDay = dateKeys.map((key) => ({
    date: key,
    ...(byDayMap.get(key) || { count: 0, passed: 0, failed: 0 }),
  }));

  const byProjectMap = new Map<string, number>();
  for (const run of runs) {
    byProjectMap.set(run.projectId, (byProjectMap.get(run.projectId) || 0) + 1);
  }
  const projectNameMap = new Map(accessibleProjects.map((item) => [item.id, item.name]));
  const executionsByProject = Array.from(byProjectMap.entries()).map(([projectId, count]) => ({
    name: projectNameMap.get(projectId) || 'Unknown',
    count,
  }));

  return NextResponse.json({
    totalExecutions,
    passedCount,
    failedCount,
    passRate,
    avgDuration,
    executionsByDay,
    executionsByProject,
  });
}
