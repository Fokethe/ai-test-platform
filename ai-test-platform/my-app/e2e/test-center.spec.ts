import { test, expect } from '@playwright/test';

/**
 * 测试中心模块 E2E 测试
 * 测试用例管理、套件管理、AI生成等
 */

test.describe('测试中心模块', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);
    await page.goto('/tests');
  });

  test.describe('测试用例列表', () => {
    
    test('应该显示测试用例列表页面', async ({ page }) => {
      await expect(page).toHaveTitle(/测试|Tests/);
      await expect(page.locator('text=测试中心').or(page.locator('text=Test Center'))).toBeVisible();
    });

    test('应该显示创建用例按钮', async ({ page }) => {
      const createButton = page.locator('button:has-text("新建"), button:has-text("创建"), button:has-text("New")');
      await expect(createButton).toBeVisible();
    });

    test('应该显示搜索框', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]').or(page.locator('input[type="search"]'));
      await expect(searchInput).toBeVisible();
    });

    test('应该支持搜索功能', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]').or(page.locator('input[type="search"]'));
      await searchInput.fill('登录');
      await searchInput.press('Enter');
      
      // 验证搜索结果（可能需要等待加载）
      await page.waitForTimeout(1000);
      
      // 验证页面没有报错
      await expect(page.locator('text=错误').or(page.locator('text=Error'))).not.toBeVisible();
    });

    test('应该显示筛选器', async ({ page }) => {
      // 验证优先级筛选
      await expect(page.locator('text=优先级').or(page.locator('text=Priority'))).toBeVisible();
      
      // 验证状态筛选
      await expect(page.locator('text=状态').or(page.locator('text=Status'))).toBeVisible();
    });
  });

  test.describe('创建测试用例', () => {
    
    test('应该能打开创建用例表单', async ({ page }) => {
      // 点击创建按钮
      await page.click('button:has-text("新建")').catch(() => 
        page.click('button:has-text("创建")').catch(() =>
          page.click('button:has-text("New")')
        )
      );
      
      // 验证表单元素
      await expect(page.locator('input[name="title"]').or(page.locator('input[placeholder*="标题"]'))).toBeVisible();
      await expect(page.locator('text=前置条件').or(page.locator('text=Precondition'))).toBeVisible();
      await expect(page.locator('text=测试步骤').or(page.locator('text=Steps'))).toBeVisible();
    });

    test('应该能创建新的测试用例', async ({ page }) => {
      // 打开创建表单
      await page.click('button:has-text("新建")').catch(() => page.click('button:has-text("New")'));
      
      // 等待表单加载
      await page.waitForSelector('input[name="title"]', { timeout: 5000 });
      
      // 填写表单
      await page.fill('input[name="title"]', 'E2E测试用例 - ' + Date.now());
      
      // 填写前置条件
      const preconditionEditor = page.locator('[data-testid="precondition-editor"]').or(page.locator('textarea').nth(0));
      await preconditionEditor.fill('1. 用户已登录\n2. 网络连接正常');
      
      // 填写测试步骤
      const stepsEditor = page.locator('[data-testid="steps-editor"]').or(page.locator('textarea').nth(1));
      await stepsEditor.fill('1. 打开登录页面\n2. 输入用户名\n3. 点击登录');
      
      // 选择优先级
      await page.click('text=P1').catch(() => page.click('text=High'));
      
      // 保存
      await page.click('button:has-text("保存")').catch(() => page.click('button:has-text("Save")'));
      
      // 验证保存成功
      await expect(page.locator('text=创建成功').or(page.locator('text=Created'))).toBeVisible();
    });
  });

  test.describe('AI生成测试用例', () => {
    
    test('应该显示AI生成按钮', async ({ page }) => {
      const aiButton = page.locator('button:has-text("AI"), button:has-text("生成")');
      await expect(aiButton).toBeVisible();
    });

    test('应该能打开AI生成对话框', async ({ page }) => {
      await page.click('button:has-text("AI")').catch(() => page.click('button:has-text("生成")'));
      
      // 验证对话框元素
      await expect(page.locator('text=AI生成').or(page.locator('text=AI Generate'))).toBeVisible();
      await expect(page.locator('textarea').or(page.locator('input[placeholder*="需求"]'))).toBeVisible();
    });
  });

  test.describe('批量操作', () => {
    
    test('应该支持批量选择', async ({ page }) => {
      // 查找复选框
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click();
        
        // 验证批量操作栏出现
        await expect(page.locator('text=已选择').or(page.locator('text=selected'))).toBeVisible();
      }
    });
  });
});
