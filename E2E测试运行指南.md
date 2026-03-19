# E2E测试运行指南

## 状态
- ✅ E2E测试框架已搭建完成
- ✅ 35+测试用例已编写
- 🔄 Playwright浏览器下载中（约170MB）

## 测试框架结构

```
ai-test-platform/my-app/
├── playwright.config.ts      # Playwright配置文件
├── e2e/
│   ├── README.md             # 测试文档
│   ├── auth.spec.ts          # 认证模块（9个测试）
│   ├── dashboard.spec.ts     # 仪表盘（8个测试）
│   ├── test-center.spec.ts   # 测试中心（10个测试）
│   ├── execution-center.spec.ts  # 执行中心（7个测试）
│   ├── quality-board.spec.ts # 质量看板（6个测试）
│   └── settings.spec.ts      # 设置模块（8个测试）
```

## 测试覆盖模块

| 模块 | 测试场景 |
|------|----------|
| 认证 | 登录/注册/登出/表单验证/权限控制 |
| 仪表盘 | 核心指标/图表/导航/工作空间 |
| 测试中心 | 用例CRUD/AI生成/搜索/批量操作 |
| 执行中心 | 执行历史/定时任务/环境选择 |
| 质量看板 | Issue管理/Bug创建/筛选/详情 |
| 设置 | 个人资料/密码/API Key/通知 |

## 运行测试（浏览器安装完成后）

### 1. 确保应用运行
```bash
cd ai-test-platform/my-app
npm run dev
```

### 2. 运行E2E测试
```bash
# 运行所有测试
npm run test:e2e

# 仅Chrome浏览器
npx playwright test --project=chromium

# 有界面模式
npm run test:e2e:headed

# UI调试模式
npm run test:e2e:ui

# 查看报告
npm run test:e2e:report
```

## 浏览器安装状态检查

### 查看下载进度
打开日志文件：
```
C:\Users\Administrator\AppData\Local\Temp\cline\background-1773851760943-i0jwhim.log
```

### 检查已安装浏览器
```bash
npx playwright install --dry-run
```

### 如网络慢，可尝试镜像源
```bash
# PowerShell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://playwright.azureedge.net"
npx playwright install chromium

# CMD
set PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net
npx playwright install chromium
```

## 测试账号
- 邮箱: `demo@example.com`
- 密码: `password123`

## 配置说明
- 基础URL: `http://localhost:3000`
- 支持浏览器: Chrome, Firefox, Safari, 移动端
- 失败重试: 1次（本地）/ 2次（CI）
- 失败自动截图，重试录制视频

## 下一步操作

1. **等待浏览器下载完成**（约5-10分钟）
2. **确保应用在localhost:3000运行**
3. **运行测试**: `npm run test:e2e`
4. **查看HTML报告**: `npm run test:e2e:report`

## 常见问题

### Q: 测试找不到页面
确保Next.js应用已启动：`npm run dev`

### Q: 登录失败
确保演示账号存在于数据库中，可运行：`npm run db:seed`

### Q: 测试超时
检查网络连接，或增加超时配置：`actionTimeout: 30000`

## 浏览器下载完成后的首次运行

```bash
cd ai-test-platform/my-app

# 1. 安装依赖（如未安装）
npm install

# 2. 安装Playwright浏览器
npx playwright install

# 3. 启动应用
npm run dev

# 4. 新开终端运行测试
npm run test:e2e
```
