import { test, expect } from '@playwright/test';

test.describe('Auth module', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page renders', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
  });

  test('unauthenticated user is redirected with callbackUrl when opening dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login\?callbackUrl=/);

    const url = new URL(page.url());
    expect(url.searchParams.get('callbackUrl')).toBe('/dashboard');
  });

  test('invalid credentials keep user on login page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', `missing-${Date.now()}@example.com`);
    await page.fill('input#password', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/login/);
  });

  test('register supports mixed-case email and auto-login', async ({ page }) => {
    const uniqueEmail = `User.${Date.now()}@Example.COM`;

    await page.goto('/register');
    await page.fill('input#name', 'E2E User');
    await page.fill('input#email', uniqueEmail);
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/workspaces/, { timeout: 20000 });
  });
});
