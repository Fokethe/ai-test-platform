# AI Test Platform - 项目概述

> **生成日期**: 2026-03-18  
> **文档版本**: v1.0 (基于代码扫描生成)  
> **项目状态**: 维护优化期 (P0/P1 已完成，P2 规划中)

---

## 🎯 产品定位

AI Test Platform 是一个**零代码友好的智能测试平台**，通过 AI 辅助和可视化操作，帮助 QA 团队、产品经理甚至非技术人员高效完成测试工作。

### 核心价值
- 🤖 **AI 生成测试用例** - 基于需求自动生成功能测试用例
- 📝 **可视化测试管理** - 工作空间/项目/系统多级组织
- ▶️ **自动化执行** - Playwright 驱动测试执行
- 📊 **数据驱动报告** - 实时质量看板和趋势分析

---

## 🏗️ 技术架构

### 技术栈概览

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Next.js + React | 16.1.6 / 19.2.3 |
| **开发语言** | TypeScript | 5.x |
| **UI 组件** | shadcn/ui + TailwindCSS | 4.x |
| **数据库** | Prisma ORM + SQLite | 6.x |
| **认证** | NextAuth.js | 4.24.13 |
| **测试** | Jest + Playwright | 29.x / 1.58 |
| **AI 能力** | LangChain + OpenAI SDK | 1.2.x |
| **部署** | Docker + Vercel | - |

### 项目结构

```
ai-test-platform/
├── my-app/                    # 主应用 (Next.js)
│   ├── src/
│   │   ├── app/              # App Router 路由
│   │   ├── components/       # React 组件
│   │   ├── lib/              # 工具函数 & AI 逻辑
│   │   └── types/            # TypeScript 类型
│   ├── prisma/
│   │   └── schema.prisma     # 数据模型定义
│   └── package.json
├── deploy-test/               # 部署测试环境
├── docs/                      # 项目文档
├── design-artifacts/          # WDS 设计工件
└── _bmad/                     # BMAD 配置
```

---

## 💾 数据模型

### 核心实体关系

```
Workspace (工作空间)
  └── Project (项目)
        ├── System (系统)
        │     └── Page (页面)
        ├── Test (测试) [CASE|SUITE|FOLDER]
        ├── Run (执行)
        ├── Issue (问题) [BUG|TASK|IMPROVEMENT]
        ├── Asset (资产) [DOC|PAGE|SNIPPET]
        ├── Integration (集成)
        └── CustomField (自定义字段)

User (用户)
  ├── Inbox (通知)
  ├── ApiKey (API 密钥)
  └── UserSettings (设置)
```

### 关键模型说明

| 模型 | 说明 | 状态 |
|------|------|------|
| **Test** | 统一测试模型 (合并旧 TestCase/TestSuite) | ✅ 新模型 |
| **Run** | 统一执行模型 (合并旧 TestRun) | ✅ 新模型 |
| **Issue** | 统一问题模型 (取代旧 Bug) | ✅ 新模型 |
| **Asset** | 统一资产模型 (合并 KnowledgeEntry/Page) | ✅ 新模型 |
| **Integration** | 统一集成模型 (取代 Webhook) | ✅ 新模型 |

---

## 📱 功能模块

### 已实现功能 (P0/P1)

| 模块 | 功能 | 状态 |
|------|------|------|
| **用户管理** | 注册/登录/权限管理/个人设置 | ✅ 已完成 |
| **工作空间** | 多工作空间/项目/系统管理 | ✅ 已完成 |
| **测试中心** | 用例管理/AI生成/批量操作/高级搜索 | ✅ 已完成 |
| **执行中心** | 单次执行/定时任务/执行记录 | ✅ 已完成 |
| **质量看板** | Issue管理/自动录入/测试报告 | ✅ 已完成 |
| **资产库** | 文档/页面/代码片段管理 | ✅ 已完成 |
| **集成** | Webhook/GitHub/GitLab/Jenkins | ✅ 已完成 |
| **通知** | 站内信/邮件/实时推送 | ✅ 已完成 |
| **仪表盘** | 核心指标/数据可视化 | ✅ 已完成 |

### 规划功能 (P2)

- [ ] UI 布局优化
- [ ] 可视化录制
- [ ] AI Bug 分析
- [ ] 第三方集成增强 (Jira/禅道)

---

## 🚀 开发指南

### 环境要求
- Node.js 20+
- npm 或 yarn

### 快速启动

```bash
cd ai-test-platform/my-app
npm install

# 配置环境变量
cp .env.example .env.local

# 数据库初始化
npm run db:generate
npm run db:migrate
npm run db:seed    # 可选

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run start        # 启动生产服务器

# 测试
npm run test         # 运行单元测试
npm run test:api     # 运行 API 测试
npm run test:coverage # 生成覆盖率报告

# 数据库
npm run db:migrate   # 执行迁移
npm run db:studio    # 打开 Prisma Studio
npm run db:seed      # 填充测试数据

# Docker
npm run docker:build # 构建 Docker 镜像
npm run docker:up    # 启动容器
```

---

## 📊 项目状态

### 代码健康度

| 指标 | 状态 |
|------|------|
| 测试通过率 | 95.1% (371/390) |
| 构建状态 | ✅ 成功 |
| ESLint | ⚠️ 配置循环引用待修复 |
| TypeScript | ⚠️ 47 个类型错误待修复 |

### 最近更新

- **2026-03-17**: 前端大重构 Phase 3 完成，20 个页面 Bento 风格化
- **2026-03-09**: AI 架构优化完成，RAG 召回率提升至 85%

---

## 📚 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 旧 PRD | `../PRD.md` | 原始需求文档 (已过时) |
| 开发规范 | `../01-开发文档/04-使用指南/KIMI.md` | 编码规范 |
| 架构设计 | `../01-开发文档/01-架构文档/系统架构设计.md` | 架构详情 |

---

## 🤝 协作信息

- **维护者**: AI 开发工程师
- **仓库**: https://github.com/Fokethe/ai-test-platform
- **演示账号**: demo@example.com / password123

---

*本文档基于代码扫描自动生成，反映当前代码实际状态*