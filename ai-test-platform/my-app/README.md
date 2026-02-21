# AI Test Platform - 智能测试平台

> 零代码友好的 AI 辅助测试平台，通过 AI 生成测试用例和自动化执行，帮助 QA 团队高效完成测试工作。

## ✨ 核心功能

- 🤖 **AI 生成测试用例** - 输入需求描述，AI 自动生成正向/反向/边界测试用例
- 📝 **手动创建用例** - 支持多步骤编辑、优先级设置
- ▶️ **自动化测试执行** - 集成 Playwright，一键执行测试用例
- 📊 **执行报告** - 实时查看执行进度、截图、日志
- 🏢 **层级管理** - 工作空间 → 项目 → 系统 → 页面 → 用例

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ai-test-platform/my-app
npm install
```

### 2. 配置环境变量（可选）

如需使用真实 AI，在 `.env` 中添加：
```env
KIMI_API_KEY=your_kimi_api_key
```

如不配置，AI 生成功能将使用模拟数据。

### 3. 初始化数据库

```bash
npm run db:migrate
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 默认账号

- **邮箱**: `demo@example.com`
- **密码**: `password123`

## 📖 使用指南

### 创建测试用例

**方式 1: AI 生成**
1. 进入页面详情
2. 点击 "AI 生成用例"
3. 输入需求描述（如"用户登录功能"）
4. 选择生成选项
5. 点击生成，选择需要的用例导入

**方式 2: 手动创建**
1. 进入页面详情
2. 点击 "新建用例"
3. 填写标题、前置条件、步骤、预期结果
4. 保存

### 执行测试

1. 在用例列表或页面详情找到用例
2. 点击执行按钮（▶️）
3. 系统自动跳转到执行详情页
4. 查看执行结果和截图

## 🛠 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript + TailwindCSS 4 + shadcn/ui
- **后端**: Next.js API Routes + Prisma ORM
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **认证**: NextAuth.js v4
- **AI**: Kimi API (Moonshot AI)
- **测试执行**: Playwright

## 📁 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 认证页面
│   ├── (dashboard)/          # 主控制台
│   │   ├── ai-generate/      # AI 生成用例
│   │   ├── executions/       # 执行记录
│   │   ├── pages/            # 页面管理
│   │   ├── projects/         # 项目管理
│   │   ├── systems/          # 系统管理
│   │   ├── testcases/        # 用例管理
│   │   └── workspaces/       # 工作空间
│   └── api/                  # API 路由
├── components/ui/            # UI 组件
├── lib/                      # 工具函数
│   ├── ai/                   # AI 相关
│   └── playwright/           # 测试执行
└── types/                    # 类型定义
```

## 📝 开发进度

- ✅ Day 1-2: 项目初始化
- ✅ Day 3-4: 数据库模型
- ✅ Day 5-7: 基础页面
- ✅ Day 8-10: AI 生成核心
- ✅ Day 11-12: 测试执行
- ⏳ Day 13-14: Demo 完善（可选）

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT
