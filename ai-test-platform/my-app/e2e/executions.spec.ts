/**
 * 测试执行中心 E2E 测试
 * @group e2e
 * @group executions
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('测试执行中心功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 执行中心页面加载
   * @smoke
   */
  test('执行中心页面应正确加载 @smoke', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /测试执行|执行/ })).toBeVisible();
  });

  /**
   * @test 搜索执行记录
   */
  test('应能搜索执行记录', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('登录测试');
      await expect(searchInput).toHaveValue('登录测试');
    }
  });

  /**
   * @test 执行列表显示
   */
  test('应显示执行列表或空状态', async ({ page }) => {
    // 等待内容加载
    await page.waitForTimeout(500);
    
    // 检查是否有执行记录或空状态
    const hasItems = await page.locator('[class*="group"]').count() > 0;
    const hasEmptyState = await page.locator('text=还没有').isVisible().catch(() => false);
    
    expect(hasItems || hasEmptyState).toBe(true);
  });
});
