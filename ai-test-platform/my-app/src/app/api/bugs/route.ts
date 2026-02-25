import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Severity, BugStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as BugStatus | null;
    const severity = searchParams.get('severity') as Severity | null;
    const assigneeId = searchParams.get('assigneeId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (assigneeId) where.assigneeId = assigneeId;

    const [bugs, total] = await Promise.all([
      prisma.bug.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          testCase: { select: { id: true, title: true } },
          execution: { select: { id: true, status: true, errorMessage: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.bug.count({ where })
    ]);

    const parsedBugs = bugs.map(bug => ({
      ...bug,
      steps: bug.steps ? JSON.parse(bug.steps) : null,
      screenshots: bug.screenshots ? JSON.parse(bug.screenshots) : null
    }));

    return NextResponse.json({
      data: parsedBugs,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    console.error('Failed to fetch bugs:', error);
    return NextResponse.json({ error: 'Failed to fetch bugs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, severity, steps, screenshots, testCaseId, executionId, projectId } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: 'Title and projectId are required' }, { status: 400 });
    }

    const bug = await prisma.bug.create({
      data: {
        title,
        description,
        severity: severity || 'MEDIUM',
        status: 'NEW',
        steps: steps ? JSON.stringify(steps) : null,
        screenshots: screenshots ? JSON.stringify(screenshots) : null,
        testCaseId,
        executionId,
        projectId,
        reporterId: session.user.id
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ data: bug }, { status: 201 });
  } catch (error) {
    console.error('Failed to create bug:', error);
    return NextResponse.json({ error: 'Failed to create bug' }, { status: 500 });
  }
}
