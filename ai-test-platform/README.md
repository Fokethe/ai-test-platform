# AI Test Platform

> 智能测试平台 - 支持AI生成测试用例、测试执行、报告生成等功能

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-cyan)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.6-green)](https://www.prisma.io/)

---

## ✨ 功能特性

- 🤖 **AI生成测试用例** - 基于需求描述自动生成测试用例
- 📝 **测试用例管理** - 工作空间、项目、系统、页面多级管理
- ▶️ **测试执行** - 支持Playwright自动化测试执行
- 📊 **报告中心** - 测试报告和统计分析
- 🎨 **现代化UI** - 基于shadcn/ui的美观界面
- ⚡ **高性能** - SWR缓存、路由预加载、骨架屏优化

---

## 🚀 快速开始

### 环境要求
- Node.js 20+
- npm 或 yarn

### 安装依赖
```bash
cd my-app
npm install
```

### 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置数据库和API密钥
```

### 数据库初始化
```bash
# 生成Prisma客户端
npm run db:generate

# 执行数据库迁移
npm run db:migrate

# (可选) 填充测试数据
npm run db:seed
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

---

## 📁 项目结构

```
ai-test-platform/
├── my-app/                    # Next.js 应用
│   ├── src/
│   │   ├── app/              # 应用路由
│   │   ├── components/       # 组件
│   │   ├── lib/              # 工具函数
│   │   └── ...
│   ├── prisma/               # 数据库模型
│   └── package.json
│
├── 📋 PRD.md                 # 核心产品需求文档
├── docs/                     # 项目文档（已重组）
│   ├── 00-core/             # ⭐ 核心文档（从这里开始）
│   ├── 01-开发文档/          # 架构、API、开发规范
│   ├── 02-运维部署/          # 部署配置
│   ├── 03-参考资料/          # 参考资料
│   └── 90-归档/              # 历史归档（过程性文档）
│
├── scripts/                  # 工具脚本
│   ├── git-init.ps1         # Git初始化
│   └── git-push.ps1         # Git推送
│
└── README.md                 # 本文件
```

---

## 📝 文档导航

### 📋 核心文档（⭐ 推荐）

| 文档 | 说明 |
|------|------|
| **[docs/00-core/project-overview.md](docs/00-core/project-overview.md)** | **项目概述** - 技术栈、功能模块、开发指南（基于代码扫描生成） |
| [docs/00-core/README.md](docs/00-core/README.md) | 文档导航与快速开始 |
| [docs/01-开发文档/04-使用指南/KIMI.md](docs/01-开发文档/04-使用指南/KIMI.md) | 开发规范与技术约定 |
| [docs/01-开发文档/01-架构文档/系统架构设计.md](docs/01-开发文档/01-架构文档/系统架构设计.md) | 系统架构设计 |

### ⚠️ 历史文档（已过时）

| 文档 | 说明 |
|------|------|
| [📋 PRD.md](./PRD.md) | 原始需求文档（内容已过时，仅供参考） |
| [docs/90-归档/](docs/90-归档/) | 历史归档（重构计划、验收报告等） |

---

## 🔧 Git 版本管理

### 初始化仓库
```powershell
.\scripts\git-init.ps1 -GithubUsername "yourusername"
```

### 推送代码
```powershell
# 普通推送
.\scripts\git-push.ps1 -Message "feat: 添加新功能"

# 创建标签并推送
.\scripts\git-push.ps1 -Message "release: v0.1.0" -CreateTag -TagName "v0.1.0"
```

### 推送记录
所有推送记录保存在 `docs/90-归档/07-验收报告/` 目录下

---

### 自动化测试
```bash
# 安装Playwright浏览器
npx playwright install

# 运行测试
npm run test
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.6 | 全栈框架 |
| React | 19.2.3 | UI库 |
| TypeScript | 5.x | 类型安全 |
| TailwindCSS | 4.x | 样式 |
| Prisma | 6.6.0 | ORM |
| NextAuth | 4.24.13 | 认证 |
| SWR | 2.x | 数据缓存 |
| Playwright | 1.58.2 | 自动化测试 |

---

## 📄 许可证

MIT License

---

**最后更新**: 2026-02-17  
**维护者**: AI 开发工程师
