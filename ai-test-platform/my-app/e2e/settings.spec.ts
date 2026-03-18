/**
 * 系统设置 E2E 测试
 * @group e2e
 * @group settings
 * @p1
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('个人设置', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 个人设置页面加载
   */
  test('个人设置页面应正确加载', async ({ page }) => {
    // 检查页面标题或主要内容
    const heading = page.locator('h1, h2').filter({ hasText: /个人|设置/ });
    await expect(heading).toBeVisible();
  });
});

test.describe('AI 设置', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test AI 设置页面加载
   */
  test('AI 设置页面应正确加载', async ({ page }) => {
    // 检查页面标题
    const heading = page.locator('h1, h2').filter({ hasText: /AI|设置/ });
    await expect(heading).toBeVisible();
  });
});

test.describe('用户管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/settings/users');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 用户管理页面加载
   */
  test('用户管理页面应正确加载', async ({ page }) => {
    // 检查页面标题
    const heading = page.locator('h1, h2').filter({ hasText: /用户|管理/ });
    await expect(heading).toBeVisible();
  });
});
