import { auth } from '@/lib/auth';
import { hasProjectAccess } from '@/lib/project-access';
import { prisma } from '@/lib/prisma';

function normalizeText(value: string | null) {
  if (!value) {
    return '';
  }
  return value.trim();
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = normalizeText(searchParams.get('projectId'));

  if (projectId) {
    const allowed = await hasProjectAccess(session.user.id, projectId);
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const folders = await prisma.test.findMany({
    where: {
      type: 'FOLDER',
      status: { not: 'ARCHIVED' },
      ...(projectId
        ? { projectId }
        : {
            project: {
              OR: [
                { members: { some: { userId: session.user.id } } },
                { workspace: { members: { some: { userId: session.user.id } } } },
                { workspace: { ownerId: session.user.id } },
              ],
            },
          }),
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      parentId: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
  });

  return Response.json(folders);
}

