import { test, expect, type APIResponse, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { login, TEST_USER } from './auth.setup';
import { ensureDemoContext, gotoWithRetry } from './support/e2e-fixtures';

const prisma = new PrismaClient();

type IssueFixture = {
  projectId: string;
};

type ApiErrorShape = {
  error?: { message?: string };
};

let fixture: IssueFixture;

function ensureId(id: string | undefined, message: string): string {
  if (!id) {
    throw new Error(message);
  }
  return id;
}

async function expectApiSuccess<T extends ApiErrorShape>(
  response: APIResponse,
  fallbackMessage: string
): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok()) {
    throw new Error(payload.error?.message || fallbackMessage);
  }
  return payload;
}

async function createIssueViaForm(page: Page, projectId: string): Promise<string> {
  await page.goto('/quality/issues/new');
  await expect(page).toHaveURL(/\/quality\/issues\/new(?:\?.*)?$/);

  const form = page.locator('form');
  await expect(form).toBeVisible();
  await form.locator('input').first().fill(projectId);
  await form.locator('input[name="title"]').fill(`Quality Board E2E ${Date.now()}`);
  await form.locator('textarea[name="description"]').fill('Quality board e2e create issue');

  const createIssueResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/issues') && response.request().method() === 'POST'
  );
  await form.locator('button[type="submit"]').first().click();
  const createIssueResponse = await createIssueResponsePromise;
  const createIssueJson = await expectApiSuccess<{ data?: { id?: string }; error?: { message?: string } }>(
    createIssueResponse,
    'Create issue failed'
  );

  return ensureId(createIssueJson.data?.id, 'Create issue response missing id');
}

async function createIssueViaApi(page: Page, projectId: string): Promise<string> {
  const createIssueResponse = await page.request.post('/api/issues', {
    data: {
      title: `Quality Transition E2E ${Date.now()}`,
      description: 'Quality board transition e2e',
      type: 'BUG',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      projectId,
    },
  });
  const createIssueJson = await expectApiSuccess<{ data?: { id?: string }; error?: { message?: string } }>(
    createIssueResponse,
    'Pre-create issue failed'
  );

  return ensureId(createIssueJson.data?.id, 'Pre-create issue response missing id');
}

async function assertIssueReadable(page: Page, issueId: string): Promise<void> {
  const detailResponse = await page.request.get(`/api/issues/${issueId}`);
  const detailJson = (await detailResponse.json()) as { data?: { id?: string } };
  expect(detailResponse.ok()).toBeTruthy();
  expect(detailJson?.data?.id).toBe(issueId);
}

async function transitionIssueStatuses(page: Page, issueId: string): Promise<void> {
  for (const targetStatus of ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const) {
    const updateResponse = await page.request.put(`/api/issues/${issueId}`, {
      data: { status: targetStatus },
    });
    await expectApiSuccess(updateResponse, `Update issue failed when setting ${targetStatus}`);

    const detailResponse = await page.request.get(`/api/issues/${issueId}`);
    const detailJson = (await detailResponse.json()) as { data?: { status?: string } };
    expect(detailJson?.data?.status).toBe(targetStatus);
  }
}

test.describe('质量看板模块', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const prepared = await ensureDemoContext(prisma);
    fixture = { projectId: prepared.projectId };
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/quality');
  });

  test('应显示质量看板页面', async ({ page }) => {
    await expect(page).toHaveURL(/\/quality(?:\?.*)?$/);
    await expect(page.locator('a[href="/quality/issues/new"]').first()).toBeVisible();
    await expect(page.locator('a[href="/quality/issues"]').first()).toBeVisible();
  });

  test('应能打开问题列表页面', async ({ page }) => {
    await page.goto('/quality/issues');
    await expect(page).toHaveURL(/\/quality\/issues(?:\?.*)?$/);
    await expect(page.locator('a[href="/quality/issues/new"]').first()).toBeVisible();
  });

  test('应能创建问题并访问详情页', async ({ page }) => {
    const issueId = await createIssueViaForm(page, fixture.projectId);
    await gotoWithRetry(page, `/quality/issues/${issueId}`);
    await expect(page).toHaveURL(new RegExp(`/quality/issues/${issueId}$`));
    await assertIssueReadable(page, issueId);
  });

  test('应支持详情页状态流转', async ({ page }) => {
    const issueId = await createIssueViaApi(page, fixture.projectId);
    await transitionIssueStatuses(page, issueId);
  });
});
