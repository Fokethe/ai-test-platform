import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { BugStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(BugStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const bug = await prisma.bug.findUnique({ where: { id: params.id } });
    if (!bug) {
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 });
    }

    const validTransitions: Record<BugStatus, BugStatus[]> = {
      'NEW': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['FIXED', 'CLOSED'],
      'FIXED': ['VERIFIED', 'IN_PROGRESS'],
      'VERIFIED': ['CLOSED', 'IN_PROGRESS'],
      'CLOSED': ['NEW']
    };

    if (bug.status !== status && !validTransitions[bug.status].includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${bug.status} to ${status}` },
        { status: 400 }
      );
    }

    const updatedBug = await prisma.bug.update({
      where: { id: params.id },
      data: { status },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ data: updatedBug });
  } catch (error) {
    console.error('Failed to update bug status:', error);
    return NextResponse.json({ error: 'Failed to update bug status' }, { status: 500 });
  }
}
