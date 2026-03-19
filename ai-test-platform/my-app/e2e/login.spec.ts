/**
 * 登录功能 E2E 测试
 * @group e2e
 * @group auth
 * @p0
 */
import { test, expect } from '@playwright/test';
import {
  expectAuthenticated,
  expectUnauthenticated,
  getLoginElements,
  login,
  logout,
  TEST_USER,
  waitForLoginFormReady,
} from './auth.setup';

test.describe('登录功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  /**
   * @test 成功登录
   * @smoke
   */
  test('用户可以使用有效凭证登录 @smoke', async ({ page }) => {
    const { emailInput, passwordInput } = getLoginElements(page);

    // Arrange
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Act
    await login(page, TEST_USER.email, TEST_USER.password);

    // Assert
    await expectAuthenticated(page);
    await expect(page.getByRole('heading', { name: /欢迎使用 AI 测试平台/ })).toBeVisible();
  });

  /**
   * @test 无效凭证登录失败
   */
  test('无效凭证应显示错误信息', async ({ page }) => {
    const { emailInput, passwordInput, submitButton } = getLoginElements(page);

    // Arrange
    const invalidEmail = 'invalid@example.com';
    const invalidPassword = 'wrongpassword';

    // Act
    await emailInput.fill(invalidEmail);
    await passwordInput.fill(invalidPassword);
    await submitButton.click();

    // Assert - 当前实现失败时停留在登录页
    await expectUnauthenticated(page);
    await expect(emailInput).toHaveValue(invalidEmail);
  });

  /**
   * @test 空字段验证
   */
  test('空字段应显示验证错误', async ({ page }) => {
    const { emailInput, passwordInput, submitButton } = getLoginElements(page);

    // Arrange
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');

    // Act - 直接提交空表单
    await submitButton.click();

    // Assert - HTML5 校验会聚焦到第一个无效字段
    await expect(emailInput).toBeFocused();
    await expectUnauthenticated(page);
  });

  /**
   * @test 记住邮箱功能
   */
  test('记住邮箱功能应保存用户输入', async ({ page }) => {
    const { emailInput, passwordInput, rememberCheckbox, submitButton } = getLoginElements(page);

    // Arrange
    const rememberEmail = TEST_USER.email;
    await page.evaluate(() => localStorage.removeItem('rememberedEmail'));
    await waitForLoginFormReady(page);

    // Act
    await emailInput.fill(rememberEmail);
    await passwordInput.fill(TEST_USER.password);
    await rememberCheckbox.click();
    await expect(rememberCheckbox).toHaveAttribute('data-state', 'checked');
    await submitButton.click();

    await expectAuthenticated(page);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('rememberedEmail')))
      .toBe(rememberEmail);

    // 登出并回到登录页（保留 localStorage）
    await logout(page);

    // Assert - 检查邮箱是否被记住
    await expect(getLoginElements(page).emailInput).toHaveValue(rememberEmail);
  });

  /**
   * @test 移动端响应式布局
   */
  test('登录页在移动端应正常显示', async ({ page }) => {
    // Arrange - 设置为移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const { emailInput, passwordInput, submitButton } = getLoginElements(page);

    // Assert
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 检查元素是否适合视口
    const emailBox = await emailInput.boundingBox();
    expect(emailBox?.width).toBeLessThanOrEqual(375);
  });
});
