# AI Test Platform - 文档索引

> **生成日期**: 2026-03-18  
> **文档版本**: v1.0

---

## 📋 项目概览

- **项目名称**: AI Test Platform (智能测试平台)
- **项目类型**: Next.js Web 应用 (Monorepo)
- **技术栈**: Next.js 16 + React 19 + TypeScript + Prisma
- **当前状态**: 维护优化期 (P0/P1 已完成)

---

## 📚 生成文档

### 核心文档

| 文档 | 路径 | 说明 |
|------|------|------|
| [项目概述](./project-overview.md) | `./project-overview.md` | 产品定位、技术栈、功能模块、开发指南 |

### 项目知识库

| 文档 | 路径 | 说明 |
|------|------|------|
| [开发规范](./04-使用指南/KIMI.md) | `ai-test-platform/docs/04-使用指南/KIMI.md` | 编码规范与技术约定 |
| [架构设计](./01-架构文档/系统架构设计.md) | `ai-test-platform/docs/01-架构文档/系统架构设计.md` | 系统架构详情 |

### 历史文档 (仅供参考)

| 文档 | 路径 | 说明 |
|------|------|------|
| 原始 PRD | `ai-test-platform/PRD.md` | ⚠️ 原始需求文档，内容已过时 |
| 前端重构计划 | `ai-test-platform/docs/06-项目管理/frontend-big-refactor-plan.md` | 历史重构计划 |
| 验收报告 | `ai-test-platform/docs/07-验收报告/` | 各阶段验收记录 |

---

## 🚀 快速开始

### 1. 了解项目
👉 阅读 [项目概述](./project-overview.md) - 了解产品定位、技术架构和功能模块

### 2. 开发准备
👉 参考项目概述中的 **开发指南** 章节

### 3. 编码规范
👉 查看 [KIMI.md](./04-使用指南/KIMI.md) - 开发规范与技术约定

---

## 🏗️ 项目结构

```
d:\ai-test-platform-1/
├── docs/                          # 项目文档 (本文档所在)
│   ├── index.md                   # 文档索引 (本文件)
│   ├── project-overview.md        # 项目概述
│   └── project-scan-report.json   # 扫描状态
│
├── ai-test-platform/              # 主项目目录
│   ├── my-app/                    # Next.js 主应用
│   │   ├── src/
│   │   │   ├── app/              # App Router 路由
│   │   │   ├── components/       # React 组件
│   │   │   ├── lib/              # 工具函数 & AI 逻辑
│   │   │   └── types/            # TypeScript 类型
│   │   ├── prisma/
│   │   │   └── schema.prisma     # 数据模型
│   │   └── package.json
│   │
│   ├── docs/                      # 旧项目文档 (内容分散)
│   ├── PRD.md                     # 原始 PRD (已过时)
│   └── README.md                  # 项目说明
│
├── deploy-test/                   # 部署测试环境
├── design-artifacts/              # WDS 设计工件
└── _bmad/                         # BMAD 配置
```

---

## 💡 使用建议

### 对于新开发者
1. 先阅读 [项目概述](./project-overview.md) 了解整体架构
2. 查看 `my-app/prisma/schema.prisma` 了解数据模型
3. 参考 `my-app/src/app/` 了解路由结构

### 对于维护者
1. 以本文档和项目概述为准（反映代码实际状态）
2. 旧 PRD 仅供参考，不要依赖其中的具体数据
3. 新功能开发前建议更新本文档

---

## 📝 文档更新

本文档基于代码扫描自动生成。当项目有重大变更时，建议重新运行文档生成流程。

---

*最后更新: 2026-03-18*