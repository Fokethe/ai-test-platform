# encoding: utf-8
# -*- coding: utf-8 -*-

# Cline Skill Library - 总览文档
# 版本: 2.5 | 最后更新: 2026-03-16
# 分类结构: core/quality/debug/dev/design/productivity/archive

================================================================================
## 📁 Skill 目录结构
================================================================================

```
.clinerules/skills/
├── core/                          # 核心基础 Skill (5个)
│   ├── skill-orchestrator/        # Skill 编排器 (00)
│   ├── cost-control/              # 成本控制协议 (01)
│   ├── doc-processor/             # 大文档分段处理 (02)
│   ├── task-planner/              # 任务拆解与规划 (03)
│   └── doc-system/                # 文档三轨与提交系统 (06)
├── quality/                       # 质量保证 Skill (5个)
│   ├── code-review/               # 代码审查协议 (04)
│   ├── bughunter/                 # BugHunter V2.0 (09)
│   ├── health-check/              # 系统健康检查 (12)
│   ├── deep-inspector/            # 功能深度审查器 (13)
│   └── project-acceptance/        # 第三方验收专家 (14)
├── debug/                         # 调试诊断 Skill (2个)
│   ├── debug-diagnosis/           # 调试诊断协议 (07)
│   └── danger-signals/            # 危险信号检测 (08)
├── dev/                           # 开发效率 Skill (6个)
│   ├── socratic-inquiry/          # 需求审问与项目启动 (05)
│   ├── multi-task-scheduler/      # 多任务调度器 (10)
│   ├── auto-cleanup/              # 自动清理 V2.5 (11)
│   ├── mcp-builder/               # MCP 构建器
│   ├── web-artifacts-builder/     # Web 产物构建器
│   └── webapp-testing/            # Web 应用测试
├── design/                        # 设计类 Skill (2个)
│   ├── frontend-design/           # 前端设计
│   └── theme-factory/             # 主题工厂
├── productivity/                  # 生产力 Skill (7个)
│   ├── skill-creator/             # Skill 创建器
│   ├── doc-based-testcase-generator/  # 基于文档的测试用例生成
│   ├── doc-coauthoring/           # 文档协作
│   ├── docx/                      # Word 处理
│   ├── pdf/                       # PDF 处理
│   ├── pptx/                      # PPT 处理
│   └── xlsx/                      # Excel 处理
└── archive/                       # 历史归档
    └── skill-library/             # 备用 Skill 库
```

================================================================================
## 🎯 分类说明
================================================================================

### core/ - 核心基础
项目启动和日常开发中最基础、最常用的 Skills。

| Skill | 名称 | 触发关键词 | 快捷指令 |
|-------|------|-----------|----------|
| 00 | Skill 编排器 | 自动执行 | - |
| 01 | 成本控制协议 | 每轮自动触发 | `/cost` |
| 02 | 大文档分段处理 | "整理文档" | `/next` |
| 03 | 任务拆解与规划 | "开发新功能" | `/plan`, `/next` |
| 06 | 文档三轨与提交系统 | "提交代码" | `/memory` |

### quality/ - 质量保证
代码质量检查、Bug 修复、项目验收相关 Skills。

| Skill | 名称 | 触发关键词 | 快捷指令 |
|-------|------|-----------|----------|
| 04 | 代码审查协议 | "重构", "优化代码" | - |
| 09 | BugHunter V2.0 | "BugHunter", "深度修复" | `/bughunter` |
| 12 | 系统健康检查 | "检查健康" | `/health` |
| 13 | 功能深度审查器 | "深度检查" | `/inspect` |
| 14 | 第三方验收专家 | "验收项目" | `/acceptance` |

### debug/ - 调试诊断
调试和问题诊断相关 Skills。

| Skill | 名称 | 触发关键词 | 快捷指令 |
|-------|------|-----------|----------|
| 07 | 调试诊断协议 | "修复bug", "debug" | - |
| 08 | 危险信号检测 | 自动触发 | - |

### dev/ - 开发效率
提升开发效率的 Skills。

| Skill | 名称 | 触发关键词 | 快捷指令 |
|-------|------|-----------|----------|
| 05 | 需求审问与项目启动 | "开始新项目" | - |
| 10 | 多任务调度器 | "使用 subagent" | `/parallel` |
| 11 | 自动清理 V2.5 | "清理项目" | `/cleanup` |

### design/ - 设计类
前端设计和 UI 相关 Skills。

| Skill | 名称 | 触发关键词 | 用途 |
|-------|------|-----------|------|
| - | 前端设计 | "设计界面", "前端开发" | 创建高质量前端界面 |
| - | 主题工厂 | "创建主题", "主题设计" | 主题生成和管理 |

### productivity/ - 生产力
文档处理和生产力工具 Skills。

| Skill | 名称 | 触发关键词 | 用途 |
|-------|------|-----------|------|
| - | Skill 创建器 | "创建 skill" | 创建和改进 Skills |
| - | 文档协作 | "协作文档" | 多人文档协作 |
| - | 各类文档处理 | "处理 docx/pdf/pptx/xlsx" | 文档自动化处理 |

================================================================================
## 🚀 使用指南
================================================================================

### 加载 Skill

```
"加载 Skill 03" → 加载任务拆解与规划
"从 core/ 加载 cost-control" → 加载成本控制协议
"显示所有 Skill" → 列出本目录所有 Skill
```

### 快捷指令总表

| 分类 | 指令 | 功能 | 所在目录 |
|------|------|------|---------|
| 💰 | `/cost` | 显示当前累计消耗 | core/cost-control/ |
| 📋 | `/plan` | 重新生成计划 | core/task-planner/ |
| 📋 | `/next` | 继续下一阶段 | core/task-planner/, core/doc-processor/ |
| 📋 | `/memory` | 更新 memory.md | core/doc-system/ |
| 🎯 | `/parallel` | 启动多任务调度 | dev/multi-task-scheduler/ |
| 🧹 | `/cleanup` | 自动清理 | dev/auto-cleanup/ |
| 🔍 | `/bughunter` | 启动 BugHunter | quality/bughunter/ |
| 🔍 | `/inspect` | 功能深度审查 | quality/deep-inspector/ |
| 🔍 | `/health` | 系统健康检查 | quality/health-check/ |
| 🎯 | `/acceptance` | 项目验收 | quality/project-acceptance/ |

### Intent 自动触发

| 用户意图 | 触发关键词 | 自动执行 Skill 序列 |
|---------|-----------|---------------------|
| 新项目启动 | "开始新项目" | cost-control → socratic-inquiry → task-planner → doc-system |
| 功能开发 | "开发新功能" | cost-control → task-planner → code-review → doc-system |
| Bug 修复 | "修复bug" | cost-control → debug-diagnosis → danger-signals → code-review |
| 项目验收 | "验收项目" | cost-control → project-acceptance |
| 自动清理 | "清理项目" | cost-control → auto-cleanup |

================================================================================
## 🔄 迁移说明
================================================================================

### 旧结构 → 新结构

**旧结构** (v2.4 及之前):
```
.clinerules/skills/
├── skill-00-global-tools.md
├── skill-01-cost-control.md
├── ...
└── skill-14-project-acceptance.md
```

**新结构** (v2.5+):
```
.clinerules/skills/
├── core/
│   ├── skill-orchestrator/SKILL.md (原 00)
│   ├── cost-control/SKILL.md (原 01)
│   ├── doc-processor/SKILL.md (原 02)
│   ├── task-planner/SKILL.md (原 03)
│   └── doc-system/SKILL.md (原 06)
├── quality/
│   ├── code-review/SKILL.md (原 04)
│   ├── bughunter/SKILL.md (原 09)
│   ├── health-check/SKILL.md (原 12)
│   ├── deep-inspector/SKILL.md (原 13)
│   └── project-acceptance/SKILL.md (原 14)
├── debug/
│   ├── debug-diagnosis/SKILL.md (原 07)
│   └── danger-signals/SKILL.md (原 08)
├── dev/
│   ├── socratic-inquiry/SKILL.md (原 05)
│   ├── multi-task-scheduler/SKILL.md (原 10)
│   ├── auto-cleanup/SKILL.md (原 11)
│   ├── mcp-builder/ (已有)
│   ├── web-artifacts-builder/ (已有)
│   └── webapp-testing/ (已有)
└── ... (其他新增分类)
```

### 兼容性

- 原有单文件 skill-XX-xxx.md 保留作为兼容层
- 新目录结构采用 SKILL.md 标准格式
- 支持渐进式迁移

================================================================================
## 📊 统计信息
================================================================================

| 分类 | Skill 数量 | 说明 |
|------|-----------|------|
| core | 5个 | 核心基础，日常使用频率最高 |
| quality | 5个 | 质量保证，项目里程碑时使用 |
| debug | 2个 | 调试诊断，问题排查时使用 |
| dev | 6个 | 开发效率，持续使用 |
| design | 2个 | 设计类，UI 开发时使用 |
| productivity | 7个 | 生产力工具，文档处理时使用 |
| archive | 1个 | 历史归档 |
| **总计** | **~28个** | 覆盖完整开发流程 |

================================================================================
## 📝 更新日志
================================================================================

### v2.5 (2026-03-16)
- ✅ 重构 Skill 目录结构，按功能分类
- ✅ 迁移原有 15 个核心 Skill 到新结构
- ✅ 整合新增 Skill (design/dev/productivity)
- ✅ 更新文档格式为标准化 SKILL.md

### v2.4 (2026-03-12)
- 原有单文件 Skill 结构
- 14 个核心 Skill

================================================================================
*文档版本: 2.5 | 最后更新: 2026-03-16 | Skill 总数: ~28个*
