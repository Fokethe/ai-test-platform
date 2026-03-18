/**
 * AI 智能生成 E2E 测试
 * @group e2e
 * @group ai-generate
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('AI 智能生成功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/ai-generate');
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test AI 生成页面加载
   * @smoke
   */
  test('AI 生成页面应正确加载 @smoke', async ({ page }) => {
    // 使用 role 选择器更可靠
    await expect(page.getByRole('heading', { name: /AI 智能生成/i })).toBeVisible();
  });

  /**
   * @test 需求生成卡片
   */
  test('需求生成卡片应显示并可用', async ({ page }) => {
    // 使用更灵活的选择器
    const demandCard = page.locator('h3', { hasText: /需求生成/ });
    await expect(demandCard).toBeVisible();
    
    // 查找卡片内的按钮
    const card = demandCard.locator('..');
    await expect(card.getByRole('button', { name: /开始生成|需求生成/ })).toBeVisible();
  });

  /**
   * @test 用例生成卡片
   */
  test('用例生成卡片应显示并可用', async ({ page }) => {
    const caseCard = page.locator('h3', { hasText: /用例生成/ });
    await expect(caseCard).toBeVisible();
  });

  /**
   * @test 导航到需求生成页面
   */
  test('应能导航到需求生成页面', async ({ page }) => {
    // 点击需求生成卡片
    await page.getByRole('link', { name: /需求生成/ }).first().click();
    
    // 等待导航完成
    await page.waitForURL(/.*ai-generate\/requirements/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*ai-generate\/requirements/);
  });

  /**
   * @test 导航到用例生成页面
   */
  test('应能导航到用例生成页面', async ({ page }) => {
    // 点击用例生成卡片
    await page.getByRole('link', { name: /用例生成/ }).first().click();
    
    // 等待导航完成
    await page.waitForURL(/.*ai-generate\/testcases/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*ai-generate\/testcases/);
  });

  /**
   * @test 最近生成历史区域
   */
  test('应显示最近生成历史区域', async ({ page }) => {
    // 使用更通用的选择器
    await expect(page.locator('h2', { hasText: /最近生成/ })).toBeVisible();
  });

  /**
   * @test 使用提示区域
   */
  test('应显示使用提示', async ({ page }) => {
    await expect(page.locator('h3', { hasText: /使用提示/ })).toBeVisible();
  });
});

test.describe('AI 需求生成页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/ai-generate/requirements');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 需求生成页面加载
   */
  test('需求生成页面应正确加载', async ({ page }) => {
    // 检查页面标题或主要内容
    const heading = page.locator('h1, h2').filter({ hasText: /需求生成|需求/ });
    await expect(heading).toBeVisible();
  });
});

test.describe('AI 用例生成页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/ai-generate/testcases');
    await page.waitForLoadState('networkidle');
  });

  /**
   * @test 用例生成页面加载
   */
  test('用例生成页面应正确加载', async ({ page }) => {
    // 检查页面标题或主要内容
    const heading = page.locator('h1, h2').filter({ hasText: /用例生成|用例/ });
    await expect(heading).toBeVisible();
  });
});
