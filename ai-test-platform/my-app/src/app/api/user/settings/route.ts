import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errors, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const DEFAULT_SETTINGS = {
  emailNotify: true,
  pushNotify: true,
  executionNotify: true,
  inviteNotify: true,
  systemNotify: true,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
};

function normalizeLanguage(value: unknown): 'zh-CN' | 'en' | null {
  if (value === 'zh-CN' || value === 'zh') {
    return 'zh-CN';
  }
  if (value === 'en' || value === 'en-US') {
    return 'en';
  }
  return null;
}

function buildSettingsPayload(user: {
  language: string;
  timezone: string;
  settings: {
    emailNotify: boolean;
    pushNotify: boolean;
    executionNotify: boolean;
    inviteNotify: boolean;
    systemNotify: boolean;
  } | null;
}) {
  return {
    emailNotify: user.settings?.emailNotify ?? DEFAULT_SETTINGS.emailNotify,
    pushNotify: user.settings?.pushNotify ?? DEFAULT_SETTINGS.pushNotify,
    executionNotify: user.settings?.executionNotify ?? DEFAULT_SETTINGS.executionNotify,
    inviteNotify: user.settings?.inviteNotify ?? DEFAULT_SETTINGS.inviteNotify,
    systemNotify: user.settings?.systemNotify ?? DEFAULT_SETTINGS.systemNotify,
    language: normalizeLanguage(user.language) ?? DEFAULT_SETTINGS.language,
    timezone: user.timezone || DEFAULT_SETTINGS.timezone,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      language: true,
      timezone: true,
      settings: {
        select: {
          emailNotify: true,
          pushNotify: true,
          executionNotify: true,
          inviteNotify: true,
          systemNotify: true,
        },
      },
    },
  });

  if (!user) {
    return errors.notFound('User');
  }

  return successResponse(buildSettingsPayload(user));
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest('Invalid JSON payload');
  }

  const userUpdate: { language?: 'zh-CN' | 'en'; timezone?: string } = {};
  const settingsUpdate: {
    emailNotify?: boolean;
    pushNotify?: boolean;
    executionNotify?: boolean;
    inviteNotify?: boolean;
    systemNotify?: boolean;
  } = {};

  const languageInput = (body as { language?: unknown })?.language;
  if (languageInput !== undefined) {
    const normalized = normalizeLanguage(languageInput);
    if (!normalized) {
      return errors.badRequest('Invalid language');
    }
    userUpdate.language = normalized;
  }

  const timezoneInput = (body as { timezone?: unknown })?.timezone;
  if (timezoneInput !== undefined) {
    if (typeof timezoneInput !== 'string' || timezoneInput.trim().length === 0) {
      return errors.badRequest('Invalid timezone');
    }
    userUpdate.timezone = timezoneInput.trim();
  }

  const notificationKeys: Array<keyof typeof settingsUpdate> = [
    'emailNotify',
    'pushNotify',
    'executionNotify',
    'inviteNotify',
    'systemNotify',
  ];
  for (const key of notificationKeys) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined) {
      if (typeof value !== 'boolean') {
        return errors.badRequest(`Invalid ${key}`);
      }
      settingsUpdate[key] = value;
    }
  }

  if (Object.keys(userUpdate).length === 0 && Object.keys(settingsUpdate).length === 0) {
    return errors.badRequest('No settings to update');
  }

  const result = await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: session.user.id },
        data: userUpdate,
      });
    }

    if (Object.keys(settingsUpdate).length > 0) {
      await tx.userSettings.upsert({
        where: { userId: session.user.id },
        update: settingsUpdate,
        create: {
          userId: session.user.id,
          emailNotify: settingsUpdate.emailNotify ?? DEFAULT_SETTINGS.emailNotify,
          pushNotify: settingsUpdate.pushNotify ?? DEFAULT_SETTINGS.pushNotify,
          executionNotify: settingsUpdate.executionNotify ?? DEFAULT_SETTINGS.executionNotify,
          inviteNotify: settingsUpdate.inviteNotify ?? DEFAULT_SETTINGS.inviteNotify,
          systemNotify: settingsUpdate.systemNotify ?? DEFAULT_SETTINGS.systemNotify,
        },
      });
    }

    return tx.user.findUnique({
      where: { id: session.user.id },
      select: {
        language: true,
        timezone: true,
        settings: {
          select: {
            emailNotify: true,
            pushNotify: true,
            executionNotify: true,
            inviteNotify: true,
            systemNotify: true,
          },
        },
      },
    });
  });

  if (!result) {
    return errors.notFound('User');
  }

  return successResponse(buildSettingsPayload(result), 'Settings updated');
}
