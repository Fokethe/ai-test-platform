/**
 * E2E 测试认证设置
 * 提供共享的登录/登出功能
 */
import { test as base, expect, Page } from '@playwright/test';

/**
 * 测试用户凭证
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
};

/**
 * 扩展的测试 fixture，包含认证功能
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  /**
   * 已登录的页面 fixture
   */
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await use(page);
  },
});

/**
 * 登录功能
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  
  // 等待表单加载
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // 填充登录表单
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // 提交表单
  await page.click('button[type="submit"]');
  
  // 等待导航完成
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * 登出功能
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/logout');
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * 验证是否已登录
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

/**
 * 验证是否已登出
 */
export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();
}

export { expect };
