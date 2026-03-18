/**
 * 登录功能 E2E 测试
 * @group e2e
 * @group auth
 * @p0
 */
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('登录功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  /**
   * @test 成功登录
   * @smoke
   */
  test('用户可以使用有效凭证登录 @smoke', async ({ page }) => {
    // Arrange
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // Act
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  /**
   * @test 无效凭证登录失败
   */
  test('无效凭证应显示错误信息', async ({ page }) => {
    // Arrange
    const invalidEmail = 'invalid@example.com';
    const invalidPassword = 'wrongpassword';
    
    // Act
    await page.fill('input[name="email"]', invalidEmail);
    await page.fill('input[name="password"]', invalidPassword);
    await page.click('button[type="submit"]');
    
    // Assert
    await expect(page.locator('[data-testid="error-message"], .text-red-600')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  /**
   * @test 空字段验证
   */
  test('空字段应显示验证错误', async ({ page }) => {
    // Act - 直接提交空表单
    await page.click('button[type="submit"]');
    
    // Assert - 检查 HTML5 验证或自定义错误
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // 验证字段是否显示验证错误（HTML5 required 属性）
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  /**
   * @test 记住邮箱功能
   */
  test('记住邮箱功能应保存用户输入', async ({ page, context }) => {
    // Arrange
    const rememberEmail = 'remember@example.com';
    
    // Act
    await page.fill('input[name="email"]', rememberEmail);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.check('input[type="checkbox"][name="remember"]');
    await page.click('button[type="submit"]');
    
    // 登出
    await page.goto('/logout');
    
    // 重新打开登录页
    await page.goto('/login');
    
    // Assert - 检查邮箱是否被记住
    const emailValue = await page.inputValue('input[name="email"]');
    expect(emailValue).toBe(rememberEmail);
  });

  /**
   * @test 移动端响应式布局
   */
  test('登录页在移动端应正常显示', async ({ page }) => {
    // Arrange - 设置为移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Assert
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 检查元素是否适合视口
    const emailBox = await page.locator('input[name="email"]').boundingBox();
    expect(emailBox?.width).toBeLessThanOrEqual(375);
  });
});
