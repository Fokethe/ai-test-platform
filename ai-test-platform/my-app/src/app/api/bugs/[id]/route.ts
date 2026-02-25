import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bug = await prisma.bug.findUnique({
      where: { id: params.id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, title: true, preCondition: true, steps: true, expectation: true } },
        execution: { select: { id: true, status: true, logs: true, errorMessage: true, screenshots: true, createdAt: true } },
        project: { select: { id: true, name: true } }
      }
    });

    if (!bug) {
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...bug,
        steps: bug.steps ? JSON.parse(bug.steps) : null,
        screenshots: bug.screenshots ? JSON.parse(bug.screenshots) : null
      }
    });
  } catch (error) {
    console.error('Failed to fetch bug:', error);
    return NextResponse.json({ error: 'Failed to fetch bug' }, { status: 500 });
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
    const { title, description, severity, status, assigneeId, steps, screenshots, externalId } = body;

    const existingBug = await prisma.bug.findUnique({ where: { id: params.id } });
    if (!existingBug) {
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 });
    }

    const bug = await prisma.bug.update({
      where: { id: params.id },
      data: {
        title,
        description,
        severity,
        status,
        assigneeId,
        steps: steps !== undefined ? (steps ? JSON.stringify(steps) : null) : undefined,
        screenshots: screenshots !== undefined ? (screenshots ? JSON.stringify(screenshots) : null) : undefined,
        externalId
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ data: bug });
  } catch (error) {
    console.error('Failed to update bug:', error);
    return NextResponse.json({ error: 'Failed to update bug' }, { status: 500 });
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

    await prisma.bug.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bug:', error);
    return NextResponse.json({ error: 'Failed to delete bug' }, { status: 500 });
  }
}
