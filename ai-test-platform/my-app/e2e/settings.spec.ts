import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('Settings', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/settings/profile', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('profile settings page loads', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('can navigate to AI settings', async ({ page }) => {
    await page.goto('/settings/ai', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/ai(?:\?.*)?$/);
  });

  test('can navigate to roles settings', async ({ page }) => {
    await page.goto('/settings/roles', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/roles(?:\?.*)?$/);
  });
});
