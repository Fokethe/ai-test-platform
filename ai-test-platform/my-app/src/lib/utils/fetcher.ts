/**
 * Safe fetch helpers for SWR and direct API calls.
 * - Enforces HTTP status checks
 * - Enforces JSON responses for JSON endpoints
 * - Supports request timeout via AbortController
 */

export type SafeFetcherOptions = {
  timeoutMs?: number;
  init?: RequestInit;
};

const DEFAULT_FETCH_TIMEOUT_MS = 10000;

function getErrorMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedError = record.error;

  if (nestedError && typeof nestedError === 'object') {
    const nestedRecord = nestedError as Record<string, unknown>;
    if (typeof nestedRecord.message === 'string' && nestedRecord.message.trim().length > 0) {
      return nestedRecord.message;
    }
  }

  if (typeof record.message === 'string' && record.message.trim().length > 0) {
    return record.message;
  }

  return null;
}

export async function safeFetcher(url: string, options: SafeFetcherOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...(options.init || {}),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`API timeout after ${timeoutMs}ms`);
    }
    throw error;
  }

  clearTimeout(timeoutId);

  if (!res.ok) {
    let message = `API error: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      const extracted = getErrorMessageFromPayload(body);
      if (extracted) {
        message = extracted;
      }
    } catch {
      // Ignore body parsing errors and keep default HTTP message.
    }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
  }

  return res.json();
}

export const swrFetcher = (url: string) => safeFetcher(url);
