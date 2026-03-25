/**
 * E2E 测试认证设置
 * 提供共享的登录/登出功能
 */
import { test as base, expect, Page } from '@playwright/test';

/**
 * 测试用户凭证
 */
export const TEST_USER = {
  email: 'demo@example.com',
  password: 'password123',
};

export function getLoginElements(page: Page) {
  return {
    emailInput: page.locator('input#email'),
    passwordInput: page.locator('input#password'),
    rememberCheckbox: page.locator('button#remember[role="checkbox"]'),
    submitButton: page.getByRole('button', { name: '登录' }),
  };
}

export async function waitForLoginFormReady(page: Page): Promise<void> {
  const { emailInput, passwordInput, rememberCheckbox } = getLoginElements(page);

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(rememberCheckbox).toBeVisible();
}

/**
 * 扩展的测试 fixture，包含认证功能
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  /**
   * 已登录的页面 fixture
   */
  authenticatedPage: async ({ page }, runPage) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await runPage(page);
  },
});

/**
 * 登录功能
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      name: 'Demo User',
    },
  });
  const registerStatus = registerResponse.status();
  if (!registerResponse.ok() && registerStatus !== 409) {
    throw new Error(`Failed to ensure test user, status=${registerStatus}`);
  }

  await page.goto('/login');
  await waitForLoginFormReady(page);

  const { emailInput, passwordInput, submitButton } = getLoginElements(page);

  // 等待表单加载并填充
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // 提交表单并等待跳转
  await submitButton.click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 30000 });
}

/**
 * 登出功能
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
}

/**
 * 验证是否已登录
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(page.getByRole('link', { name: '工作台' })).toBeVisible();
}

/**
 * 验证是否已登出
 */
export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(getLoginElements(page).emailInput).toBeVisible();
}

export { expect };
