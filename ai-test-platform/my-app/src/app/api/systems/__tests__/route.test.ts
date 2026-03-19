import { GET, POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    system: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
  },
}));

describe('/api/systems route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 without session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/systems') as never);
    expect(response.status).toBe(401);
  });

  it('GET returns 403 for unauthorized projectId filter', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/systems?projectId=proj-1') as never);
    expect(response.status).toBe(403);
  });

  it('POST creates system for authorized manager', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'proj-1' });
    (prisma.system.create as jest.Mock).mockResolvedValue({
      id: 'sys-1',
      name: 'System 1',
      projectId: 'proj-1',
    });

    const response = await POST(
      new Request('http://localhost/api/systems', {
        method: 'POST',
        body: JSON.stringify({
          name: 'System 1',
          baseUrl: 'https://example.com',
          projectId: 'proj-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(201);
    expect(prisma.system.create).toHaveBeenCalled();
  });
});
