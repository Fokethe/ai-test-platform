import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
<<<<<<< HEAD
  // 只扫描 e2e 目录下的 .spec.ts 文件
  testDir: './e2e',
  testMatch: '*.spec.ts',
  testIgnore: ['**/*.test.ts', '**/node_modules/**', '**/deploy-test/**', '**/.kimi/**', '**/docs/**'],

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
=======
  testDir: './e2e',
  
  /* 测试文件匹配模式 */
  testMatch: '*.spec.ts',
  
  /* 完全并行执行 */
  fullyParallel: true,
  
  /* 在CI中禁止只测试 */
  forbidOnly: !!process.env.CI,
  
  /* 重试配置 */
  retries: process.env.CI ? 2 : 1,
  
  /* 工作进程数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 报告器配置 */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  
  /* 共享配置 */
  use: {
    /* 基础URL */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    /* 收集跟踪信息 */
    trace: 'on-first-retry',
    
    /* 截图配置 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'on-first-retry',
    
    /* 视口大小 */
    viewport: { width: 1280, height: 720 },
    
    /* 动作超时 */
    actionTimeout: 15000,
    
    /* 导航超时 */
    navigationTimeout: 30000,
>>>>>>> 9921f4a1cd546bdd45bf4754c5bd90f5b83e4807
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

<<<<<<< HEAD
  /* 本地开发服务器配置 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
=======
  /* 本地开发服务器配置 - 禁用自动启动，假设服务器已在运行 */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
>>>>>>> 9921f4a1cd546bdd45bf4754c5bd90f5b83e4807
});
