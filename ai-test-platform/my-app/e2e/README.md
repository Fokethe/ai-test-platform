# E2E 测试套件

本文档描述了 AI Test Platform 的端到端 (E2E) 测试套件。

## 测试框架

- **框架**: Playwright
- **版本**: 1.58.2
- **测试目录**: `./e2e`
- **配置文件**: `playwright.config.ts`

## 测试文件结构

```
e2e/
├── auth.spec.ts          # 认证模块测试
├── dashboard.spec.ts     # 仪表盘模块测试
├── test-center.spec.ts   # 测试中心模块测试
├── execution-center.spec.ts  # 执行中心模块测试
├── quality-board.spec.ts # 质量看板模块测试
└── settings.spec.ts      # 设置模块测试
```

## 测试覆盖范围

### 1. 认证模块 (auth.spec.ts)
- 登录页面显示
- 登录表单验证（空字段、无效邮箱格式）
- 演示账号登录成功
- 错误密码登录失败
- 未认证用户重定向
- 用户菜单显示
- 注册页面显示
- 注册表单验证
- 用户登出功能

### 2. 仪表盘模块 (dashboard.spec.ts)
- 仪表盘页面显示
- 核心指标卡片（总用例数、今日执行、通过率、失败数）
- 执行趋势图表
- 时间筛选器切换（7天/30天/90天）
- 最近执行记录
- 侧边导航菜单
- 导航跳转
- 工作空间选择器

### 3. 测试中心模块 (test-center.spec.ts)
- 测试用例列表页面
- 创建用例按钮
- 搜索功能
- 筛选器（优先级、状态）
- 创建测试用例表单
- AI生成测试用例
- 批量操作

### 4. 执行中心模块 (execution-center.spec.ts)
- 执行历史页面
- 执行记录列表
- 执行状态筛选
- 执行详情查看
- 新建执行页面
- 执行环境选择
- 定时任务页面

### 5. 质量看板模块 (quality-board.spec.ts)
- 质量看板页面
- Issue统计卡片
- 类型筛选（BUG/TASK）
- 严重程度筛选
- 创建Issue表单
- Issue详情查看

### 6. 设置模块 (settings.spec.ts)
- 设置页面显示
- 个人资料设置
- 修改个人资料
- 密码修改区域
- API Key管理
- 工作空间设置
- 成员管理
- 通知设置
- 通知开关切换

## 运行测试

### 运行所有E2E测试
```bash
npm run test:e2e
```

### 运行特定浏览器测试
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 有界面模式运行
```bash
npm run test:e2e:headed
```

### 调试模式
```bash
npm run test:e2e:debug
```

### UI模式
```bash
npm run test:e2e:ui
```

### 查看测试报告
```bash
npm run test:e2e:report
```

## 配置说明

### 基础URL
测试默认使用 `http://localhost:3000` 作为基础URL。可以通过环境变量覆盖：
```bash
TEST_BASE_URL=http://your-domain.com npm run test:e2e
```

### 浏览器配置
支持以下浏览器/设备：
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### 重试机制
- CI环境：2次重试
- 本地环境：1次重试

### 截图和视频
- 失败时自动截图
- 首次重试时录制视频
- 首次重试时收集跟踪信息

## 测试账号

测试使用以下演示账号：
- 邮箱: `demo@example.com`
- 密码: `password123`

## 注意事项

1. 确保应用服务器在 `http://localhost:3000` 运行
2. 测试前确保演示账号存在
3. 测试会创建真实数据（测试用例、Bug等），建议在测试环境运行
4. 移动端测试会调整视口大小模拟移动设备

## 持续集成

测试配置支持CI环境：
- 禁止only测试
- 减少工作进程数
- 增加重试次数

## 维护建议

1. 定期更新测试用例以匹配UI变化
2. 添加新的页面和功能测试
3. 保持测试数据独立性
4. 使用data-testid属性提高测试稳定性
