import { prisma } from '@/lib/prisma';

export type DashboardNotificationType = 'success' | 'warning' | 'error' | 'info';
export type BellNotificationType = 'SYSTEM' | 'EXECUTION' | 'INVITE';

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  type: DashboardNotificationType;
  read: boolean;
  createdAt: string;
};

export type BellNotification = {
  id: string;
  title: string;
  content: string;
  type: BellNotificationType;
  read: boolean;
  createdAt: string;
  data?: string;
};

type ListOptions = {
  unreadOnly: boolean;
  page: number;
  pageSize: number;
};

const DEFAULT_RECENT_LIMIT = 10;

function toDashboardType(rawType: string): DashboardNotificationType {
  const value = rawType.toUpperCase();
  if (value.includes('ERROR') || value.includes('FAILED')) {
    return 'error';
  }
  if (value.includes('WARN') || value.includes('ALERT')) {
    return 'warning';
  }
  if (value.includes('SUCCESS') || value.includes('EXECUTION')) {
    return 'success';
  }
  return 'info';
}

function toBellType(rawType: string): BellNotificationType {
  const value = rawType.toUpperCase();
  if (value.includes('INVITE') || value.includes('MENTION')) {
    return 'INVITE';
  }
  if (value.includes('SUCCESS') || value.includes('EXECUTION')) {
    return 'EXECUTION';
  }
  return 'SYSTEM';
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function fetchDashboardNotifications(userId: string, options: ListOptions) {
  const { unreadOnly, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  try {
    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [total, unreadCount, rows] = await Promise.all([
      prisma.inbox.count({ where }),
      prisma.inbox.count({ where: { userId, isRead: false } }),
      prisma.inbox.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notifications: DashboardNotification[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.content,
      type: toDashboardType(row.type),
      read: row.isRead,
      createdAt: toIsoString(row.createdAt),
    }));

    return {
      total,
      unreadCount,
      notifications,
    };
  } catch {
    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [total, unreadCount, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notifications: DashboardNotification[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.content,
      type: toDashboardType(row.type),
      read: row.read,
      createdAt: toIsoString(row.createdAt),
    }));

    return {
      total,
      unreadCount,
      notifications,
    };
  }
}

export async function fetchUnreadSnapshot(userId: string, limit = DEFAULT_RECENT_LIMIT) {
  try {
    const [unreadCount, rows] = await Promise.all([
      prisma.inbox.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.inbox.findMany({
        where: {
          userId,
          isRead: false,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const recentNotifications: BellNotification[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: toBellType(row.type),
      read: row.isRead,
      createdAt: toIsoString(row.createdAt),
    }));

    return { unreadCount, recentNotifications };
  } catch {
    const [unreadCount, rows] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
      prisma.notification.findMany({
        where: {
          userId,
          read: false,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const recentNotifications: BellNotification[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: toBellType(row.type),
      read: row.read,
      createdAt: toIsoString(row.createdAt),
      data: row.data ?? undefined,
    }));

    return { unreadCount, recentNotifications };
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  try {
    const inbox = await prisma.inbox.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (inbox) {
      if (!inbox.isRead) {
        await prisma.inbox.update({
          where: { id: inbox.id },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      }
      return true;
    }
  } catch {
    // Fallback to legacy notifications table.
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
      read: true,
    },
  });

  if (!notification) {
    return false;
  }

  if (!notification.read) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        read: true,
      },
    });
  }

  return true;
}

export async function markAllNotificationsAsRead(userId: string) {
  let updatedCount = 0;

  try {
    const result = await prisma.inbox.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    updatedCount += result.count;
  } catch {
    // Ignore missing table and continue with legacy notifications.
  }

  const legacyResult = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
  updatedCount += legacyResult.count;

  return updatedCount;
}

export async function clearAllNotifications(userId: string) {
  let deletedCount = 0;

  try {
    const result = await prisma.inbox.deleteMany({
      where: { userId },
    });
    deletedCount += result.count;
  } catch {
    // Ignore missing table and continue with legacy notifications.
  }

  const legacyResult = await prisma.notification.deleteMany({
    where: { userId },
  });
  deletedCount += legacyResult.count;

  return deletedCount;
}

export async function deleteNotification(userId: string, notificationId: string) {
  try {
    const inbox = await prisma.inbox.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: { id: true },
    });

    if (inbox) {
      await prisma.inbox.delete({
        where: { id: inbox.id },
      });
      return true;
    }
  } catch {
    // Fallback to legacy notifications table.
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: { id: true },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.delete({
    where: { id: notification.id },
  });

  return true;
}
