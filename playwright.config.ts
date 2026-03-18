import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置 - 独立配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 只扫描 e2e 目录
  testDir: './e2e',
  testMatch: '*.spec.ts',

  /* 并行运行测试 */
  fullyParallel: true,

  /* 失败时保留 worker */
  forbidOnly: !!process.env.CI,

  /* 重试次数 */
  retries: process.env.CI ? 2 : 0,

  /* 并行 worker 数 */
  workers: process.env.CI ? 1 : undefined,

  /* 报告器配置 */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* 共享配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3000',

    /* 收集所有跟踪信息 */
    trace: 'on-first-retry',

    /* 截图配置 */
    screenshot: 'only-on-failure',

    /* 视频录制 */
    video: 'on-first-retry',

    /* 浏览器视口 */
    viewport: { width: 1280, height: 720 },

    /* 超时配置 */
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  /* 项目配置 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 本地开发服务器配置 */
  webServer: {
    command: 'cd ai-test-platform/my-app && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
