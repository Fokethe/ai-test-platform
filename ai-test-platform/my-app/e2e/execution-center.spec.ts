import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { login, TEST_USER } from './auth.setup';
import { ensureTestFixture } from './support/e2e-fixtures';

const prisma = new PrismaClient();

type RunFixture = {
  projectId: string;
  testId: string;
};

let fixture: RunFixture;

test.describe('执行中心模块', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const prepared = await ensureTestFixture(prisma, {
      testName: 'Execution E2E Test',
    });
    fixture = { projectId: prepared.projectId, testId: prepared.testId };
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/runs');
  });

  test('应显示执行中心页面', async ({ page }) => {
    await expect(page).toHaveURL(/\/runs(?:\?.*)?$/);
    await expect(page.locator('a[href="/runs/new"]').first()).toBeVisible();
    await expect(page.locator('[role="tab"]').first()).toBeVisible();
  });

  test('应能打开新建执行页面', async ({ page }) => {
    await page.locator('a[href="/runs/new"]').first().click();
    await expect(page).toHaveURL(/\/runs\/new$/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('应能创建运行并获取详情接口', async ({ page }) => {
    await page.goto('/runs/new');
    await expect(page).toHaveURL(/\/runs\/new$/);

    const form = page.locator('form');
    await form.locator('input').first().fill(fixture.projectId);
    await form.locator('input').nth(1).fill(`Execution Center E2E ${Date.now()}`);
    await form.locator('textarea').first().fill(fixture.testId);

    const createRunResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/runs') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /Start Run/i }).click();
    const createRunResponse = await createRunResponsePromise;
    const createRunJson = (await createRunResponse.json()) as {
      data?: { id?: string };
      error?: { message?: string };
    };

    if (!createRunResponse.ok()) {
      throw new Error(createRunJson?.error?.message || 'Create run failed');
    }

    const runId = createRunJson?.data?.id;
    if (!runId) {
      throw new Error('Create run response missing id');
    }

    await expect.poll(async () => {
      const detailResponse = await page.request.get(`/api/runs/${runId}`);
      return detailResponse.ok();
    }).toBe(true);
  });

  test('应能打开定时任务新建页面', async ({ page }) => {
    await page.goto('/runs/scheduled/new');
    await expect(page).toHaveURL(/\/runs\/scheduled\/new$/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input').nth(2)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Scheduled Task/i })).toBeVisible();
  });
});
