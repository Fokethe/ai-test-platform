import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export type ProjectNotificationCategory = 'execution' | 'system' | 'invite';
export type ProjectNotificationType = 'EXECUTION' | 'SYSTEM' | 'INVITE';

export type ProjectNotificationInput = {
  projectId: string;
  actorId?: string;
  title: string;
  content: string;
  category: ProjectNotificationCategory;
  type?: ProjectNotificationType;
  data?: Record<string, unknown>;
  linkUrl?: string;
  linkText?: string;
  includeActor?: boolean;
};

export type ProjectNotificationReport = {
  projectId: string;
  recipients: number;
  delivered: number;
  skippedByPreference: number;
  failed: number;
};

function resolveNotificationType(inputType: ProjectNotificationType | undefined, category: ProjectNotificationCategory) {
  if (inputType) {
    return inputType;
  }
  if (category === 'execution') {
    return 'EXECUTION';
  }
  if (category === 'invite') {
    return 'INVITE';
  }
  return 'SYSTEM';
}

async function isPreferenceEnabled(userId: string, category: ProjectNotificationCategory) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      pushNotify: true,
      executionNotify: true,
      systemNotify: true,
      inviteNotify: true,
    },
  });

  if (!settings) {
    return true;
  }
  if (!settings.pushNotify) {
    return false;
  }

  if (category === 'execution') {
    return settings.executionNotify;
  }
  if (category === 'invite') {
    return settings.inviteNotify;
  }
  return settings.systemNotify;
}

async function createNotificationRecord(userId: string, input: ProjectNotificationInput, type: ProjectNotificationType) {
  const dataPayload = input.data ? JSON.stringify(input.data) : null;

  try {
    await prisma.inbox.create({
      data: {
        userId,
        type,
        title: input.title,
        content: input.content,
        linkUrl: input.linkUrl || null,
        linkText: input.linkText || null,
      },
    });
    return true;
  } catch {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type,
          title: input.title,
          content: input.content,
          read: false,
          data: dataPayload,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to persist notification:', error);
      return false;
    }
  }
}

export async function notifyProjectMembers(
  input: ProjectNotificationInput
): Promise<ProjectNotificationReport> {
  if (!input.projectId) {
    return {
      projectId: input.projectId,
      recipients: 0,
      delivered: 0,
      skippedByPreference: 0,
      failed: 0,
    };
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: input.projectId },
    select: { userId: true },
  });

  const uniqueUserIds = Array.from(new Set(members.map((member) => member.userId)));
  const recipientIds = input.includeActor
    ? uniqueUserIds
    : uniqueUserIds.filter((userId) => userId !== input.actorId);

  if (recipientIds.length === 0) {
    return {
      projectId: input.projectId,
      recipients: 0,
      delivered: 0,
      skippedByPreference: 0,
      failed: 0,
    };
  }

  const type = resolveNotificationType(input.type, input.category);
  const outcomes = await Promise.all(
    recipientIds.map(async (userId) => {
      const enabled = await isPreferenceEnabled(userId, input.category);
      if (!enabled) {
        return 'skipped' as const;
      }

      const created = await createNotificationRecord(userId, input, type);
      return created ? ('delivered' as const) : ('failed' as const);
    })
  );

  const delivered = outcomes.filter((item) => item === 'delivered').length;
  const skippedByPreference = outcomes.filter((item) => item === 'skipped').length;
  const failed = outcomes.filter((item) => item === 'failed').length;

  await writeAuditLog({
    actorId: input.actorId,
    action: 'PROJECT_NOTIFICATION_DISPATCHED',
    target: 'NOTIFICATION',
    targetId: input.projectId,
    projectId: input.projectId,
    metadata: {
      category: input.category,
      recipients: recipientIds.length,
      delivered,
      skippedByPreference,
      failed,
    },
  });

  return {
    projectId: input.projectId,
    recipients: recipientIds.length,
    delivered,
    skippedByPreference,
    failed,
  };
}
