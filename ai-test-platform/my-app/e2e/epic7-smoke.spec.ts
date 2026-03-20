import { test, expect, type APIResponse, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { login, TEST_USER } from './auth.setup';
import { ensureTestFixture, gotoWithRetry } from './support/e2e-fixtures';

const prisma = new PrismaClient();

type SmokeFixture = {
  projectId: string;
  testId: string;
};

type ApiErrorShape = {
  error?: { message?: string };
};

let fixture: SmokeFixture;

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

async function createRunViaUi(page: Page, runFixture: SmokeFixture): Promise<string> {
  await page.goto('/runs/new');
  await expect(page).toHaveURL(/\/runs\/new$/);

  const form = page.locator('form');
  await expect(form).toBeVisible();
  await form.locator('input').first().fill(runFixture.projectId);
  await form.locator('input').nth(1).fill(`Epic7 Smoke Run ${Date.now()}`);
  await form.locator('textarea').first().fill(runFixture.testId);

  const createRunResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/runs') && response.request().method() === 'POST'
  );
  await form.locator('button[type="submit"]').first().click();
  const createRunResponse = await createRunResponsePromise;
  const createRunJson = await expectApiSuccess<{ data?: { id?: string }; error?: { message?: string } }>(
    createRunResponse,
    'Create run failed'
  );

  return ensureId(createRunJson.data?.id, 'Create run response missing id');
}

async function getCreatedExecution(runId: string) {
  const execution = await prisma.execution.findFirst({
    where: { runId },
    select: { id: true, testId: true },
  });

  expect(execution?.id).toBeTruthy();
  expect(execution?.testId).toBeTruthy();
  if (!execution) {
    throw new Error('No execution created for smoke run.');
  }
  return execution;
}

async function markRunAndExecutionAsFailed(runId: string, executionId: string): Promise<void> {
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: 'FAILED',
      errorMessage: 'Epic7 smoke forced failure',
      duration: 1000,
      completedAt: new Date(),
    },
  });

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      totalCount: 1,
      passedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      completedAt: new Date(),
    },
  });
}

async function createIssueFromQuickEntry(
  page: Page,
  executionId: string,
  projectId: string
): Promise<string> {
  await page.reload();
  const quickIssueLink = page.locator(`a[href*="/quality/issues/new?executionId=${executionId}"]`).first();
  await expect(quickIssueLink).toBeVisible({ timeout: 15000 });
  await quickIssueLink.click();
  await expect(page).toHaveURL(/\/quality\/issues\/new\?/);

  const issueForm = page.locator('form');
  await expect(issueForm).toBeVisible();
  await issueForm.locator('input').first().fill(projectId);
  await issueForm.locator('input[name="title"]').fill(`Epic7 Smoke Issue ${Date.now()}`);
  await issueForm.locator('textarea[name="description"]').fill('Epic7 smoke issue creation');

  const createIssueResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/issues') && response.request().method() === 'POST'
  );
  await issueForm.locator('button[type="submit"]').first().click();
  const createIssueResponse = await createIssueResponsePromise;
  await expectApiSuccess(createIssueResponse, 'Create issue failed');

  await expect(page).toHaveURL(/\/quality\/issues\/[^/?#]+$/);
  const issueId = page.url().split('/quality/issues/')[1].split(/[?#]/)[0];
  return ensureId(issueId, 'Issue detail url missing id');
}

async function transitionIssueToClosed(page: Page, issueId: string): Promise<void> {
  const statusSelect = page.locator('select').first();
  const saveButton = page.getByRole('button', { name: /Save/i });

  for (const targetStatus of ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const) {
    await statusSelect.selectOption(targetStatus);
    await expect(statusSelect).toHaveValue(targetStatus);

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/issues/${issueId}`) &&
        response.request().method() === 'PUT'
    );
    await saveButton.click();
    const saveResponse = await saveResponsePromise;
    await expectApiSuccess(saveResponse, `Save issue failed when setting ${targetStatus}`);

    await expect.poll(async () => {
      const response = await page.request.get(`/api/issues/${issueId}`);
      const json = (await response.json()) as { data?: { status?: string } };
      return json?.data?.status || '';
    }).toBe(targetStatus);
  }
}

test.describe('Epic 7 Smoke', () => {
  test.beforeAll(async () => {
    const prepared = await ensureTestFixture(prisma, {
      testName: 'Epic7 Smoke Test',
    });
    fixture = { projectId: prepared.projectId, testId: prepared.testId };
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('runs -> quick issue -> issue transitions', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const runId = await createRunViaUi(page, fixture);
    await gotoWithRetry(page, `/runs/${runId}`);
    await expect(page).toHaveURL(new RegExp(`/runs/${runId}$`));

    const execution = await getCreatedExecution(runId);
    await markRunAndExecutionAsFailed(runId, execution.id);

    const issueId = await createIssueFromQuickEntry(page, execution.id, fixture.projectId);
    await transitionIssueToClosed(page, issueId);
  });
});
