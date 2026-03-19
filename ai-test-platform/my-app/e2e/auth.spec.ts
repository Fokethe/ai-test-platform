import { test, expect } from '@playwright/test';

/**
 * 认证模块 E2E 测试
 * 测试登录、注册、权限控制等核心流程
 */

test.describe('认证模块', () => {
  
  test.describe('登录功能', () => {
    
    test('应该显示登录页面', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // 验证页面标题和元素
      await expect(page).toHaveTitle(/登录|Sign In/);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('登录表单验证 - 空字段', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // 提交空表单
      await page.click('button[type="submit"]');
      
      // 验证验证错误
      await expect(page.locator('text=请输入邮箱').or(page.locator('text=Email is required'))).toBeVisible();
    });

    test('登录表单验证 - 无效邮箱格式', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // 输入无效邮箱
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // 验证邮箱格式错误
      await expect(page.locator('text=邮箱格式不正确').or(page.locator('text=Invalid email'))).toBeVisible();
    });

    test('使用演示账号成功登录', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // 输入演示账号
      await page.fill('input[type="email"]', 'demo@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // 提交表单
      await page.click('button[type="submit"]');
      
      // 验证重定向到仪表盘
      await expect(page).toHaveURL(/.*dashboard.*/);
      
      // 验证登录成功后的元素
      await expect(page.locator('text=仪表盘').or(page.locator('text=Dashboard'))).toBeVisible();
    });

    test('使用错误密码登录失败', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // 输入错误密码
      await page.fill('input[type="email"]', 'demo@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // 验证错误消息
      await expect(page.locator('text=密码错误').or(page.locator('text=Invalid credentials'))).toBeVisible();
      
      // 验证仍在登录页面
      await expect(page).toHaveURL(/.*signin.*/);
    });

    test('未认证用户访问受保护页面应重定向到登录', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 验证重定向到登录页
      await expect(page).toHaveURL(/.*signin.*/);
    });

    test('登录后应显示用户菜单', async ({ page }) => {
      // 先登录
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'demo@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // 等待页面加载
      await page.waitForURL(/.*dashboard.*/);
      
      // 验证用户菜单存在
      await expect(page.locator('[data-testid="user-menu"]').or(page.locator('text=demo@example.com'))).toBeVisible();
    });
  });

  test.describe('注册功能', () => {
    
    test('应该显示注册页面', async ({ page }) => {
      await page.goto('/auth/signup');
      
      await expect(page).toHaveTitle(/注册|Sign Up/);
      await expect(page.locator('input[name="email"]').or(page.locator('input[type="email"]'))).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('注册表单验证 - 密码太短', async ({ page }) => {
      await page.goto('/auth/signup');
      
      await page.fill('input[type="email"]', 'newuser@example.com');
      await page.fill('input[type="password"]', '123');
      await page.click('button[type="submit"]');
      
      // 验证密码长度错误
      await expect(page.locator('text=密码至少').or(page.locator('text=password must be'))).toBeVisible();
    });
  });

  test.describe('登出功能', () => {
    
    test('用户应该能够登出', async ({ page }) => {
      // 先登录
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'demo@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*dashboard.*/);
      
      // 点击用户菜单
      await page.click('[data-testid="user-menu"]').catch(async () => {
        // 如果找不到特定testid，尝试点击包含用户名的元素
        await page.click('text=demo@example.com');
      });
      
      // 点击登出
      await page.click('text=退出').or(page.click('text=Logout'));
      
      // 验证重定向到登录页
      await expect(page).toHaveURL(/.*signin.*/);
    });
  });
});
