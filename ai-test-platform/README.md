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
├── docs/                     # 项目文档
│   ├── README.md
│   ├── DOCUMENT_NAMING_CONVENTION.md
│   ├── 01-PRD/              # 产品需求
│   ├── 06-TEST/             # 测试文档
│   ├── 10-AUX/              # 辅助文档
│   └── 99-GIT/              # Git管理
│
├── scripts/                  # 工具脚本
│   ├── git-init.ps1         # Git初始化
│   └── git-push.ps1         # Git推送
│
└── README.md                 # 本文件
```

---

## 📝 文档导航

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 文档中心首页 |
| [docs/10-AUX/ATP-AUX-006-项目备忘录-v1.0.md](docs/10-AUX/ATP-AUX-006-项目备忘录-v1.0.md) | 项目进度跟踪 |
| [docs/06-TEST/ATP-TEST-003-问题修复追踪报告-v1.0.md](docs/06-TEST/ATP-TEST-003-问题修复追踪报告-v1.0.md) | 问题修复状态 |
| [docs/10-AUX/ATP-AUX-008-性能优化总结-v1.0.md](docs/10-AUX/ATP-AUX-008-性能优化总结-v1.0.md) | 性能优化说明 |

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
所有推送记录保存在 [docs/99-GIT/PUSH_LOG.md](docs/99-GIT/PUSH_LOG.md)

---

## 📋 测试

### 手工测试
1. 查看 [docs/06-TEST/ATP-TEST-001-功能验证清单-v1.0.md](docs/06-TEST/ATP-TEST-001-功能验证清单-v1.0.md)
2. 执行测试用例
3. 记录问题到 [docs/06-TEST/ATP-TEST-002-功能测试问题报告-v1.0.md](docs/06-TEST/ATP-TEST-002-功能测试问题报告-v1.0.md)

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
