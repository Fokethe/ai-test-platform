/**
 * 仪表盘 E2E 测试
 * @group e2e
 * @group dashboard
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('仪表盘功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 仪表盘页面加载
   * @smoke
   */
  test('仪表盘应正确加载并显示欢迎信息 @smoke', async ({ page }) => {
    // 检查主要标题
    await expect(page.locator('h1').filter({ hasText: /欢迎/ })).toBeVisible();
  });

  /**
   * @test 智能对话输入框
   */
  test('智能对话输入框应可用', async ({ page }) => {
    // 使用 placeholder 查找输入框
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    
    // 输入文本
    await input.fill('生成测试用例');
    await expect(input).toHaveValue('生成测试用例');
  });

  /**
   * @test 快速开始卡片
   */
  test('快速开始卡片应显示并可用', async ({ page }) => {
    // 检查快速开始区域的存在
    await expect(page.locator('text=快速开始').or(page.locator('h2', { hasText: /快速开始/ }))).toBeVisible();
    
    // 检查各个卡片
    await expect(page.getByRole('link', { name: /新建需求/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /生成用例/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /执行测试/ })).toBeVisible();
  });

  /**
   * @test 数据概览统计卡片
   */
  test('数据概览统计卡片应显示', async ({ page }) => {
    // 检查统计区域
    await expect(page.locator('h2', { hasText: /数据概览/ })).toBeVisible();
  });

  /**
   * @test 快捷链接导航
   */
  test('快捷链接应正确导航', async ({ page }) => {
    // 点击项目管理链接
    await page.getByRole('link', { name: /项目管理/ }).click();
    
    // 等待导航完成
    await page.waitForURL(/.*projects/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*projects/);
  });

  /**
   * @test 快速开始卡片导航
   */
  test('快速开始卡片应能导航', async ({ page }) => {
    // 点击生成用例卡片
    await page.getByRole('link', { name: /生成用例/ }).first().click();
    
    // 等待导航
    await page.waitForURL(/.*ai-generate|tests/, { timeout: 10000 });
  });
});
