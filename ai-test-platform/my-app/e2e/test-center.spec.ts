import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('Test Center', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
  });

  test('page loads', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('tabs can switch when present', async ({ page }) => {
    const tabs = page.getByRole('tab');
    const count = await tabs.count();
    if (count > 1) {
      await tabs.nth(1).click();
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toBeVisible();
    }
  });
});
