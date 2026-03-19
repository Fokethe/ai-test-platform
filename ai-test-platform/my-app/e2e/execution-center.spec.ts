import { test, expect } from '@playwright/test';

/**
 * 执行中心模块 E2E 测试
 * 测试执行历史、定时任务等
 */

test.describe('执行中心模块', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);
    await page.goto('/runs');
  });

  test.describe('执行历史列表', () => {
    
    test('应该显示执行历史页面', async ({ page }) => {
      await expect(page).toHaveTitle(/执行|Runs/);
      await expect(page.locator('text=执行中心').or(page.locator('text=Execution Center'))).toBeVisible();
    });

    test('应该显示执行记录列表', async ({ page }) => {
      // 验证列表容器存在
      const listContainer = page.locator('table').or(page.locator('[data-testid="runs-list"]'));
      await expect(listContainer).toBeVisible();
    });

    test('应该显示执行状态筛选', async ({ page }) => {
      // 验证状态筛选器
      await expect(page.locator('text=成功').or(page.locator('text=Passed'))).toBeVisible();
      await expect(page.locator('text=失败').or(page.locator('text=Failed'))).toBeVisible();
      await expect(page.locator('text=运行中').or(page.locator('text=Running'))).toBeVisible();
    });

    test('应该能查看执行详情', async ({ page }) => {
      // 查找第一行记录
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        // 点击详情链接或行
        await firstRow.click();
        
        // 验证详情页面元素
        await expect(page.locator('text=执行详情').or(page.locator('text=Run Details'))).toBeVisible();
      }
    });
  });

  test.describe('新建执行', () => {
    
    test('应该能打开新建执行页面', async ({ page }) => {
      // 点击新建按钮
      await page.click('button:has-text("新建")').catch(() => 
        page.click('button:has-text("New")')
      );
      
      // 验证页面跳转
      await expect(page).toHaveURL(/.*runs\/new.*/);
      
      // 验证表单元素
      await expect(page.locator('text=选择测试套件').or(page.locator('text=Select Test Suite'))).toBeVisible();
    });

    test('应该能选择执行环境', async ({ page }) => {
      await page.goto('/runs/new');
      
      // 验证环境选择
      await expect(page.locator('text=云端执行').or(page.locator('text=Cloud'))).toBeVisible();
      await expect(page.locator('text=本地执行').or(page.locator('text=Local'))).toBeVisible();
    });
  });

  test.describe('定时任务', () => {
    
    test('应该显示定时任务页面', async ({ page }) => {
      // 导航到定时任务
      await page.goto('/runs/schedule');
      
      await expect(page.locator('text=定时任务').or(page.locator('text=Scheduled Jobs'))).toBeVisible();
    });

    test('应该能创建定时任务', async ({ page }) => {
      await page.goto('/runs/schedule');
      
      // 点击创建按钮
      await page.click('button:has-text("创建")').catch(() => page.click('button:has-text("New")'));
      
      // 验证Cron表达式输入
      await expect(page.locator('input[placeholder*="Cron"]').or(page.locator('text=Cron'))).toBeVisible();
    });
  });
});
