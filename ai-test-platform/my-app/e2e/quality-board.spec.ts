import { test, expect } from '@playwright/test';

/**
 * 质量看板模块 E2E 测试
 * Issue管理、Bug追踪等
 */

test.describe('质量看板模块', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);
    await page.goto('/quality');
  });

  test.describe('Issue列表', () => {
    
    test('应该显示质量看板页面', async ({ page }) => {
      await expect(page).toHaveTitle(/质量|Quality/);
      await expect(page.locator('text=质量看板').or(page.locator('text=Quality Board'))).toBeVisible();
    });

    test('应该显示Issue统计卡片', async ({ page }) => {
      // 验证统计卡片
      await expect(page.locator('text=待处理').or(page.locator('text=Open'))).toBeVisible();
      await expect(page.locator('text=处理中').or(page.locator('text=In Progress'))).toBeVisible();
      await expect(page.locator('text=已解决').or(page.locator('text=Resolved'))).toBeVisible();
    });

    test('应该支持按类型筛选', async ({ page }) => {
      // 验证类型筛选器
      await expect(page.locator('text=BUG').or(page.locator('text=Bug'))).toBeVisible();
      await expect(page.locator('text=TASK').or(page.locator('text=Task'))).toBeVisible();
    });

    test('应该支持按严重程度筛选', async ({ page }) => {
      // 验证严重程度筛选
      await expect(page.locator('text=严重').or(page.locator('text=Critical'))).toBeVisible();
      await expect(page.locator('text=高').or(page.locator('text=High'))).toBeVisible();
    });
  });

  test.describe('创建Issue', () => {
    
    test('应该能打开创建Issue表单', async ({ page }) => {
      // 点击创建按钮
      await page.click('button:has-text("新建")').catch(() => 
        page.click('button:has-text("New")').catch(() =>
          page.click('button:has-text("创建")')
        )
      );
      
      // 验证表单元素
      await expect(page.locator('input[name="title"]').or(page.locator('input[placeholder*="标题"]'))).toBeVisible();
      await expect(page.locator('text=类型').or(page.locator('text=Type'))).toBeVisible();
      await expect(page.locator('text=严重程度').or(page.locator('text=Severity'))).toBeVisible();
    });

    test('应该能创建新的Bug', async ({ page }) => {
      // 打开创建表单
      await page.click('button:has-text("新建")').catch(() => page.click('button:has-text("New")'));
      
      // 等待表单加载
      await page.waitForSelector('input[name="title"]', { timeout: 5000 });
      
      // 填写标题
      await page.fill('input[name="title"]', 'E2E测试Bug - ' + Date.now());
      
      // 选择类型为BUG
      await page.click('text=BUG').catch(() => page.click('text=Bug'));
      
      // 选择严重程度
      await page.click('text=高').catch(() => page.click('text=High'));
      
      // 填写描述
      const descriptionEditor = page.locator('textarea').first();
      await descriptionEditor.fill('这是一个E2E测试创建的Bug');
      
      // 保存
      await page.click('button:has-text("保存")').catch(() => page.click('button:has-text("Save")'));
      
      // 验证保存成功
      await expect(page.locator('text=创建成功').or(page.locator('text=Created'))).toBeVisible();
    });
  });

  test.describe('Issue详情', () => {
    
    test('应该能查看Issue详情', async ({ page }) => {
      // 查找第一个Issue
      const firstIssue = page.locator('table tbody tr').first().or(page.locator('[data-testid="issue-item"]').first());
      
      if (await firstIssue.isVisible().catch(() => false)) {
        await firstIssue.click();
        
        // 验证详情页面
        await expect(page.locator('text=详情').or(page.locator('text=Details'))).toBeVisible();
      }
    });
  });
});
