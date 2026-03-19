import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile settings page loads', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('can navigate to AI settings', async ({ page }) => {
    await page.goto('/settings/ai');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('can navigate to user settings', async ({ page }) => {
    await page.goto('/settings/users');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
