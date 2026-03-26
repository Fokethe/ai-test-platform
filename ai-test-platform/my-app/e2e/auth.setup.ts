import { test as base, expect, Page } from '@playwright/test';

export const TEST_USER = {
  email: 'demo@example.com',
  password: 'password123',
};

let ensureDemoReadyPromise: Promise<void> | null = null;

const NON_LOGIN_PATH = /^\/(?!login(?:\/|$)).+/;

function isAuthenticatedUrl(urlText: string): boolean {
  try {
    const url = new URL(urlText);
    return NON_LOGIN_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

async function ensureDemoReady(page: Page): Promise<void> {
  if (!ensureDemoReadyPromise) {
    ensureDemoReadyPromise = (async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const response = await page.request.post('/api/auth/register', {
            data: {
              email: TEST_USER.email,
              password: TEST_USER.password,
              name: 'Demo User',
            },
          });
          const status = response.status();
          if (response.ok() || status === 409) {
            return;
          }
          if (attempt === 3) {
            throw new Error(`register status=${status}`);
          }
        } catch (error) {
          if (attempt === 3) {
            throw error;
          }
        }
        await page.waitForTimeout(500);
      }
    })()
      .then(() => undefined)
      .catch((error) => {
        ensureDemoReadyPromise = null;
        throw error;
      });
  }
  await ensureDemoReadyPromise;
}

export function getLoginElements(page: Page) {
  return {
    emailInput: page.locator('input#email'),
    passwordInput: page.locator('input#password'),
    rememberCheckbox: page.locator('button#remember[role="checkbox"]'),
    submitButton: page.locator('button[type="submit"]'),
  };
}

export async function waitForLoginFormReady(page: Page): Promise<void> {
  const { emailInput, passwordInput, rememberCheckbox, submitButton } = getLoginElements(page);

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(rememberCheckbox).toBeVisible();
  await expect(submitButton).toBeVisible();
}

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, runPage) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await runPage(page);
  },
});

export async function login(page: Page, email: string, password: string): Promise<void> {
  await ensureDemoReady(page);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.context().clearCookies();

    try {
      const csrfResponse = await page.request.get('/api/auth/csrf');
      if (!csrfResponse.ok()) {
        throw new Error(`csrf status=${csrfResponse.status()}`);
      }
      const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
      if (!csrfPayload?.csrfToken) {
        throw new Error('csrf token missing');
      }

      const loginResponse = await page.request.post('/api/auth/callback/credentials?json=true', {
        form: {
          csrfToken: csrfPayload.csrfToken,
          email,
          password,
          callbackUrl: 'http://localhost:3000/dashboard',
          json: 'true',
        },
      });

      const loginPayload = (await loginResponse.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!loginResponse.ok() || loginPayload.error) {
        throw new Error(
          `credentials login failed, status=${loginResponse.status()}, error=${loginPayload.error || 'unknown'}`
        );
      }

      const targetUrl = loginPayload.url || '/dashboard';
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!isAuthenticatedUrl(page.url())) {
        throw new Error(`redirected to ${page.url()}`);
      }
      return;
    } catch (error) {
      if (attempt === 2) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Login failed after 2 attempts (url=${page.url()}): ${message}`);
      }
      await page.waitForTimeout(400);
    }
  }
}

export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
}

export async function expectAuthenticated(page: Page): Promise<void> {
  await expect.poll(() => isAuthenticatedUrl(page.url())).toBe(true);
}

export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(getLoginElements(page).emailInput).toBeVisible();
}

export { expect };
