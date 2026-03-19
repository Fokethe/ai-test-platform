import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('loads and shows heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('chat input is available', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('quick links can navigate to projects', async ({ page }) => {
    const projectsLink = page.getByRole('link', { name: /项目|Project/i }).first();
    if (await projectsLink.isVisible().catch(() => false)) {
      await projectsLink.click();
      await page.waitForURL(/.*projects/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*projects/);
    }
  });
});
