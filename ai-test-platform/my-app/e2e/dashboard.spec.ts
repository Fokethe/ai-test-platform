<<<<<<< HEAD
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
=======
import { test, expect } from '@playwright/test';

/**
 * 仪表盘模块 E2E 测试
 */

test.describe('仪表盘模块', () => {
  
  // 每个测试前登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);
  });

  test('应该显示仪表盘页面', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/仪表盘|Dashboard/);
    
    // 验证核心指标卡片存在
    await expect(page.locator('text=总用例数').or(page.locator('text=Total Cases'))).toBeVisible();
    await expect(page.locator('text=今日执行').or(page.locator('text=Today'))).toBeVisible();
    await expect(page.locator('text=通过率').or(page.locator('text=Pass Rate'))).toBeVisible();
    await expect(page.locator('text=失败数').or(page.locator('text=Failed'))).toBeVisible();
  });

  test('应该显示执行趋势图表', async ({ page }) => {
    // 验证图表容器存在
    const chartContainer = page.locator('[data-testid="execution-chart"]').or(page.locator('.recharts-wrapper'));
    await expect(chartContainer).toBeVisible();
    
    // 验证时间筛选器
    await expect(page.locator('text=7天').or(page.locator('text=7 Days'))).toBeVisible();
    await expect(page.locator('text=30天').or(page.locator('text=30 Days'))).toBeVisible();
    await expect(page.locator('text=90天').or(page.locator('text=90 Days'))).toBeVisible();
  });

  test('应该显示最近执行记录', async ({ page }) => {
    // 验证最近执行区域存在
    await expect(page.locator('text=最近执行').or(page.locator('text=Recent Runs'))).toBeVisible();
    
    // 验证表格或列表存在
    const recentRunsTable = page.locator('table').or(page.locator('[data-testid="recent-runs"]'));
    await expect(recentRunsTable).toBeVisible();
  });

  test('时间筛选器应该可以切换', async ({ page }) => {
    // 点击30天按钮
    await page.click('text=30天').catch(() => page.click('text=30 Days'));
    
    // 验证30天被选中（通常有active类或不同样式）
    const thirtyDaysButton = page.locator('button:has-text("30")').or(page.locator('button:has-text("30 Days")'));
    await expect(thirtyDaysButton).toHaveClass(/active|selected/);
    
    // 点击90天按钮
    await page.click('text=90天').catch(() => page.click('text=90 Days'));
    
    // 验证图表更新（这里主要是验证交互不会报错）
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('侧边导航应该显示所有菜单项', async ({ page }) => {
    // 验证主导航项
    const navItems = [
      '仪表盘', 'Dashboard',
      '测试中心', 'Tests',
      '执行中心', 'Runs',
      '质量看板', 'Quality',
      '资产库', 'Assets',
      '设置', 'Settings'
    ];
    
    for (const item of navItems) {
      const navLink = page.locator(`nav >> text=${item}`).or(page.locator(`aside >> text=${item}`));
      await expect(navLink).toBeVisible();
    }
  });

  test('点击导航项应该跳转到对应页面', async ({ page }) => {
    // 点击测试中心
    await page.click('nav >> text=测试中心').catch(() => page.click('nav >> text=Tests'));
    await expect(page).toHaveURL(/.*tests.*/);
    
    // 返回仪表盘
    await page.goto('/dashboard');
    
    // 点击执行中心
    await page.click('nav >> text=执行中心').catch(() => page.click('nav >> text=Runs'));
    await expect(page).toHaveURL(/.*runs.*/);
  });

  test('应该显示工作空间选择器', async ({ page }) => {
    // 验证工作空间选择器存在
    const workspaceSelector = page.locator('[data-testid="workspace-selector"]').or(page.locator('text=工作空间'));
    await expect(workspaceSelector).toBeVisible();
>>>>>>> 9921f4a1cd546bdd45bf4754c5bd90f5b83e4807
  });
});
