import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { executionId } = body;

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    const execution = await prisma.testExecution.findUnique({
      where: { id: executionId },
      include: {
        testCase: {
          include: {
            page: {
              include: {
                system: {
                  include: { project: true }
                }
              }
            }
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    if (execution.status !== 'FAILED') {
      return NextResponse.json({ error: 'Only failed executions can create bugs' }, { status: 400 });
    }

    const existingBug = await prisma.bug.findFirst({
      where: { executionId, status: { not: 'CLOSED' } }
    });

    if (existingBug) {
      return NextResponse.json({ error: 'Bug already exists', data: existingBug }, { status: 409 });
    }

    const testCase = execution.testCase;
    const project = testCase?.page?.system?.project;

    if (!project) {
      return NextResponse.json({ error: 'Cannot determine project' }, { status: 400 });
    }

    const bug = await prisma.bug.create({
      data: {
        title: `[自动化] ${testCase?.title || '测试用例'} 执行失败`,
        description: `测试执行失败，错误信息：\n\n${execution.errorMessage || '无详细错误信息'}`,
        severity: 'HIGH',
        status: 'NEW',
        steps: testCase?.steps || null,
        screenshots: execution.screenshots || null,
        testCaseId: testCase?.id,
        executionId: execution.id,
        projectId: project.id,
        reporterId: session.user.id
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        testCase: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ data: bug }, { status: 201 });
  } catch (error) {
    console.error('Failed to auto-create bug:', error);
    return NextResponse.json({ error: 'Failed to auto-create bug' }, { status: 500 });
  }
}
