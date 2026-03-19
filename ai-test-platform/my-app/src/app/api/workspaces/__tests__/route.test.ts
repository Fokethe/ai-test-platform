import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { ensurePersonalWorkspace } from '@/lib/personal-workspace';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/personal-workspace', () => ({
  ensurePersonalWorkspace: jest.fn(),
  buildPersonalWorkspaceName: jest.fn(() => 'Owner Workspace'),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('/api/workspaces route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/workspaces') as never);
    expect(response.status).toBe(401);
  });

  it('GET ensures personal workspace exists before listing', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', name: 'Owner', email: 'owner@example.com' },
    });
    (prisma.workspace.count as jest.Mock).mockResolvedValue(1);
    (prisma.workspace.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Owner Workspace',
        isPersonal: true,
        ownerId: 'user-1',
        _count: { projects: 1, members: 1 },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/workspaces?page=1&pageSize=20') as never);
    expect(response.status).toBe(200);
    expect(ensurePersonalWorkspace).toHaveBeenCalledWith('user-1', {
      nameHint: 'Owner',
      email: 'owner@example.com',
    });
  });

  it('POST rejects duplicate personal workspace creation', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({ id: 'ws-existing' });

    const response = await POST(
      new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ isPersonal: true }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(409);
    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it('POST creates personal workspace with owner and owner membership', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.workspace.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.workspace.create as jest.Mock).mockResolvedValue({
      id: 'ws-2',
      name: 'Owner Workspace',
      ownerId: 'user-1',
      isPersonal: true,
      _count: { projects: 0, members: 1 },
    });

    const response = await POST(
      new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ isPersonal: true }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(201);
    expect(prisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-1',
          isPersonal: true,
          members: {
            create: {
              userId: 'user-1',
              role: 'OWNER',
            },
          },
        }),
      })
    );
  });
});
