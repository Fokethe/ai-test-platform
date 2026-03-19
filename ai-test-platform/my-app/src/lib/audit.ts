import { prisma } from '@/lib/prisma';

interface AuditRecordInput {
  actorId?: string;
  action: string;
  target: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
}

export async function writeAuditLog(input: AuditRecordInput) {
  try {
    await prisma.activity.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorId ? 'USER' : 'SYSTEM',
        action: input.action,
        target: input.target,
        targetId: input.targetId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        projectId: input.projectId,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
