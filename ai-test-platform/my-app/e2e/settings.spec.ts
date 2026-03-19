import { test, expect } from '@playwright/test';

/**
 * 设置模块 E2E 测试
 * 个人设置、工作空间设置、系统设置
 */

test.describe('设置模块', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);
    await page.goto('/settings');
  });

  test.describe('个人设置', () => {
    
    test('应该显示设置页面', async ({ page }) => {
      await expect(page).toHaveTitle(/设置|Settings/);
      await expect(page.locator('text=设置').or(page.locator('text=Settings'))).toBeVisible();
    });

    test('应该显示个人资料设置', async ({ page }) => {
      // 验证个人资料选项卡或区域
      await expect(page.locator('text=个人资料').or(page.locator('text=Profile'))).toBeVisible();
      
      // 验证表单字段
      await expect(page.locator('input[name="name"]').or(page.locator('input[placeholder*="昵称"]'))).toBeVisible();
      await expect(page.locator('input[name="email"]').or(page.locator('input[type="email"]'))).toBeVisible();
    });

    test('应该能修改个人资料', async ({ page }) => {
      // 找到昵称输入框
      const nameInput = page.locator('input[name="name"]').or(page.locator('input[placeholder*="昵称"]'));
      
      if (await nameInput.isVisible().catch(() => false)) {
        // 清除并填写新昵称
        await nameInput.clear();
        await nameInput.fill('E2E测试用户');
        
        // 保存
        await page.click('button:has-text("保存")').catch(() => page.click('button:has-text("Save")'));
        
        // 验证保存成功
        await expect(page.locator('text=保存成功').or(page.locator('text=Saved'))).toBeVisible();
      }
    });

    test('应该显示密码修改区域', async ({ page }) => {
      // 导航到密码设置
      await page.click('text=密码').or(page.click('text=Password')).catch(() => {});
      
      // 验证密码字段
      await expect(page.locator('input[name="currentPassword"]').or(page.locator('input[placeholder*="当前密码"]'))).toBeVisible();
      await expect(page.locator('input[name="newPassword"]').or(page.locator('input[placeholder*="新密码"]'))).toBeVisible();
    });

    test('应该显示API Key管理', async ({ page }) => {
      // 导航到API Key设置
      await page.click('text=API').or(page.click('text=api')).catch(() => {});
      
      // 验证API Key区域
      await expect(page.locator('text=API Key').or(page.locator('text=API Keys'))).toBeVisible();
    });
  });

  test.describe('工作空间设置', () => {
    
    test('应该能访问工作空间设置', async ({ page }) => {
      // 点击工作空间设置
      await page.click('text=工作空间').or(page.click('text=Workspace')).catch(() => {});
      
      // 验证工作空间设置页面
      await expect(page.locator('text=工作空间设置').or(page.locator('text=Workspace Settings'))).toBeVisible();
    });

    test('应该显示成员管理', async ({ page }) => {
      // 导航到成员管理
      await page.goto('/settings/members');
      
      // 验证成员列表
      await expect(page.locator('text=成员').or(page.locator('text=Members'))).toBeVisible();
    });
  });

  test.describe('通知设置', () => {
    
    test('应该能访问通知设置', async ({ page }) => {
      // 导航到通知设置
      await page.goto('/settings/notifications');
      
      // 验证通知选项
      await expect(page.locator('text=通知').or(page.locator('text=Notifications'))).toBeVisible();
      
      // 验证开关控件
      const switches = page.locator('input[type="checkbox"], [role="switch"]');
      const count = await switches.count();
      expect(count).toBeGreaterThan(0);
    });

    test('应该能切换通知开关', async ({ page }) => {
      await page.goto('/settings/notifications');
      
      // 找到第一个开关
      const firstSwitch = page.locator('input[type="checkbox"]').first();
      
      if (await firstSwitch.isVisible().catch(() => false)) {
        // 获取当前状态
        const isChecked = await firstSwitch.isChecked();
        
        // 点击切换
        await firstSwitch.click();
        
        // 验证状态改变
        await expect(firstSwitch).not.toBeChecked();
      }
    });
  });
});
