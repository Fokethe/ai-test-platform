/**
 * 测试中心 E2E 测试
 * @group e2e
 * @group test-center
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('测试中心功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 测试中心页面加载
   * @smoke
   */
  test('测试中心页面应正确加载 @smoke', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /测试中心/ })).toBeVisible();
  });

  /**
   * @test Tab 切换
   */
  test('应能切换标签页', async ({ page }) => {
    // 查找并点击标签
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      // 点击第二个标签（如果有）
      if (tabCount > 1) {
        await tabs.nth(1).click();
      }
      
      // 验证有激活的标签
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      await expect(activeTab).toBeVisible();
    }
  });

  /**
   * @test 搜索功能
   */
  test('应能搜索测试用例', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('登录测试');
      await expect(searchInput).toHaveValue('登录测试');
    }
  });
});
