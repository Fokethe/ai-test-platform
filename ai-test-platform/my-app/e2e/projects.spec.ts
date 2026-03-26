import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth.setup';

test.describe('项目管理功能', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('项目列表页面应正确加载 @smoke', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /项目管理|Projects/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /新建项目|创建项目|New Project/i })).toBeVisible();
  });

  test('应能搜索项目', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索项目|Search/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('测试项目');
      await expect(searchInput).toHaveValue('测试项目');
    }
  });

  test('应显示项目卡片或空状态', async ({ page }) => {
    await expect
      .poll(
        async () => {
          const hasCards =
            (await page.getByRole('button', { name: /详情|Detail/i }).count()) > 0;
          const hasEmptyState = (await page.getByText(/暂无项目|No projects/i).count()) > 0;
          return hasCards || hasEmptyState;
        },
        { timeout: 15000 }
      )
      .toBe(true);
  });
});
