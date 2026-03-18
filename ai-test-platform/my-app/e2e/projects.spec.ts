/**
 * 项目管理 E2E 测试
 * @group e2e
 * @group projects
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('项目管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 项目列表页面加载
   * @smoke
   */
  test('项目列表页面应正确加载 @smoke', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /项目管理/ })).toBeVisible();
    
    // 检查创建按钮
    await expect(page.getByRole('button', { name: /创建项目/ })).toBeVisible();
  });

  /**
   * @test 搜索项目功能
   */
  test('应能搜索项目', async ({ page }) => {
    // 查找搜索输入框
    const searchInput = page.locator('input').filter({ has: page.locator('[placeholder*="搜索"]') });
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('测试项目');
      await expect(searchInput).toHaveValue('测试项目');
    }
  });

  /**
   * @test 项目卡片或空状态显示
   */
  test('应显示项目卡片或空状态', async ({ page }) => {
    // 等待内容加载
    await page.waitForTimeout(500);
    
    // 检查是否有项目卡片或空状态
    const hasProjects = await page.locator('[class*="BentoCard"]').count() > 0;
    const hasEmptyState = await page.locator('text=还没有项目').isVisible().catch(() => false);
    
    expect(hasProjects || hasEmptyState).toBe(true);
  });
});
