import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

const DELIVERY_TIMEOUT_MS = 10000;
const MAX_DELIVERY_ATTEMPTS = 3;
const MAX_RESPONSE_BODY_LENGTH = 2000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type IntegrationRecord = {
  id: string;
  name: string;
  projectId: string;
  url: string;
  secret: string | null;
  events: string;
};

type RetryableFailure = {
  message: string;
  retryable: boolean;
  responseStatus?: number;
  responseBody?: string;
};

export type IntegrationEventPayload = {
  projectId: string;
  event: string;
  payload: Record<string, unknown>;
  actorId?: string;
};

export type IntegrationDeliveryResult = {
  integrationId: string;
  integrationName: string;
  deliveryId: string;
  status: 'DELIVERED' | 'FAILED';
  attempts: number;
  responseStatus?: number;
  error?: string;
};

export type IntegrationDeliveryReport = {
  event: string;
  projectId: string;
  totalTargets: number;
  delivered: number;
  failed: number;
  results: IntegrationDeliveryResult[];
};

function toSafeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: 'payload_serialization_failed' });
  }
}

function normalizeResponseBody(body: string): string {
  if (body.length <= MAX_RESPONSE_BODY_LENGTH) {
    return body;
  }
  return body.slice(0, MAX_RESPONSE_BODY_LENGTH);
}

function parseEventSubscriptions(rawEvents: string): string[] {
  if (!rawEvents || rawEvents.trim().length === 0) {
    return ['*'];
  }

  try {
    const parsed = JSON.parse(rawEvents);
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => item.length > 0);
      return normalized.length > 0 ? normalized : ['*'];
    }
  } catch {
    // Fall back to comma separated values.
  }

  const normalized = rawEvents
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : ['*'];
}

function isSubscribed(rawEvents: string, event: string): boolean {
  const subscriptions = parseEventSubscriptions(rawEvents);
  const normalizedEvent = event.toLowerCase();

  return subscriptions.some((subscription) => {
    if (subscription === '*' || subscription === 'all') {
      return true;
    }
    if (subscription === normalizedEvent) {
      return true;
    }
    if (subscription.endsWith('.*')) {
      const prefix = subscription.slice(0, -1);
      return normalizedEvent.startsWith(prefix);
    }
    return false;
  });
}

function buildSignature(secret: string | null, payload: string): string | null {
  if (!secret) {
    return null;
  }
  const digest = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${digest}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DELIVERY_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFailure(error: unknown): RetryableFailure {
  if (error && typeof error === 'object' && 'retryable' in error) {
    const retryableError = error as RetryableFailure;
    return {
      message: retryableError.message || 'delivery_failed',
      retryable: retryableError.retryable !== false,
      responseStatus: retryableError.responseStatus,
      responseBody: retryableError.responseBody,
    };
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        message: 'delivery_timeout',
        retryable: true,
      };
    }
    return {
      message: error.message || 'delivery_failed',
      retryable: true,
    };
  }

  return {
    message: 'delivery_failed',
    retryable: true,
  };
}

async function sendOnce(
  integration: IntegrationRecord,
  event: string,
  payloadText: string,
  deliveryId: string
) {
  const signature = buildSignature(integration.secret, payloadText);
  const response = await fetchWithTimeout(integration.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Event': event,
      'X-AI-Delivery-Id': deliveryId,
      ...(signature ? { 'X-AI-Signature': signature } : {}),
    },
    body: payloadText,
  });

  const responseBody = normalizeResponseBody(await response.text());
  if (!response.ok) {
    throw {
      message: `HTTP_${response.status}`,
      retryable: RETRYABLE_STATUS_CODES.has(response.status),
      responseStatus: response.status,
      responseBody,
    } satisfies RetryableFailure;
  }

  return {
    responseStatus: response.status,
    responseBody,
  };
}

async function attemptDelivery(
  integration: IntegrationRecord,
  event: string,
  payload: Record<string, unknown>,
  actorId?: string
): Promise<IntegrationDeliveryResult> {
  const payloadText = toSafeJson(payload);
  const delivery = await prisma.delivery.create({
    data: {
      integrationId: integration.id,
      event,
      payload: payloadText,
      status: 'PENDING',
      attempts: 0,
    },
    select: {
      id: true,
    },
  });

  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    try {
      const result = await sendOnce(integration, event, payloadText, delivery.id);
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          attempts: attempt,
          responseStatus: result.responseStatus,
          responseBody: result.responseBody,
          error: null,
          deliveredAt: new Date(),
        },
      });

      await writeAuditLog({
        actorId,
        action: 'INTEGRATION_DELIVERY_SUCCEEDED',
        target: 'DELIVERY',
        targetId: delivery.id,
        projectId: integration.projectId,
        metadata: {
          integrationId: integration.id,
          event,
          attempt,
          responseStatus: result.responseStatus,
        },
      });

      return {
        integrationId: integration.id,
        integrationName: integration.name,
        deliveryId: delivery.id,
        status: 'DELIVERED',
        attempts: attempt,
        responseStatus: result.responseStatus,
      };
    } catch (error) {
      const failure = normalizeFailure(error);
      const shouldRetry = failure.retryable && attempt < MAX_DELIVERY_ATTEMPTS;

      await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: shouldRetry ? 'RETRYING' : 'FAILED',
          attempts: attempt,
          responseStatus: failure.responseStatus,
          responseBody: failure.responseBody,
          error: failure.message,
          deliveredAt: shouldRetry ? null : new Date(),
        },
      });

      await writeAuditLog({
        actorId,
        action: shouldRetry ? 'INTEGRATION_DELIVERY_RETRIED' : 'INTEGRATION_DELIVERY_FAILED',
        target: 'DELIVERY',
        targetId: delivery.id,
        projectId: integration.projectId,
        metadata: {
          integrationId: integration.id,
          event,
          attempt,
          responseStatus: failure.responseStatus,
          error: failure.message,
        },
      });

      if (!shouldRetry) {
        return {
          integrationId: integration.id,
          integrationName: integration.name,
          deliveryId: delivery.id,
          status: 'FAILED',
          attempts: attempt,
          responseStatus: failure.responseStatus,
          error: failure.message,
        };
      }
    }
  }

  return {
    integrationId: integration.id,
    integrationName: integration.name,
    deliveryId: '',
    status: 'FAILED',
    attempts: MAX_DELIVERY_ATTEMPTS,
    error: 'delivery_failed',
  };
}

export async function deliverIntegrationEvent(
  input: IntegrationEventPayload
): Promise<IntegrationDeliveryReport> {
  if (!input.projectId) {
    return {
      event: input.event,
      projectId: input.projectId,
      totalTargets: 0,
      delivered: 0,
      failed: 0,
      results: [],
    };
  }

  const integrations = await prisma.integration.findMany({
    where: {
      projectId: input.projectId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      url: true,
      secret: true,
      events: true,
    },
  });

  const targets = integrations.filter((integration) =>
    isSubscribed(integration.events, input.event)
  );

  if (targets.length === 0) {
    return {
      event: input.event,
      projectId: input.projectId,
      totalTargets: 0,
      delivered: 0,
      failed: 0,
      results: [],
    };
  }

  const results = await Promise.all(
    targets.map((integration) =>
      attemptDelivery(integration, input.event, input.payload, input.actorId)
    )
  );

  const delivered = results.filter((item) => item.status === 'DELIVERED').length;
  const failed = results.filter((item) => item.status === 'FAILED').length;

  return {
    event: input.event,
    projectId: input.projectId,
    totalTargets: targets.length,
    delivered,
    failed,
    results,
  };
}
