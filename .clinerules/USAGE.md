# encoding: utf-8
# -*- coding: utf-8 -*-

# Cline 技能使用指南
# 版本: 2.0 | 最后更新: 2026-03-11

================================================================================
## 🚀 快捷指令总表
================================================================================

### 🎯 编排与调度
| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/plan` | 重新生成计划 | Task Planner |
| `/parallel` | 启动多任务调度 | Multi-Task Scheduler |
| `/next` | 继续下一阶段/下一块 | Task Planner / Doc Processor |

### 💰 成本与监控
| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/cost` | 显示当前累计消耗 | Cost Control |
| `/health` | 系统健康检查 | System Health Check |
| `/health --fix` | 自动修复可修复的问题 | System Health Check |

### 📋 规划与文档
| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/memory` | 更新 memory.md | Doc System |
| `/compact` | 压缩上下文 | Context Management |

### 🔍 代码质量
| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/bughunter` | 启动 BugHunter V2.0 | BugHunter |
| `/bughunter --high` | 仅检查高优先级问题 | BugHunter |
| `/bughunter --dim=<维度>` | 检查指定维度 | BugHunter |
| `/bughunter --scan-only` | 仅扫描不修复 | BugHunter |
| `/inspect` | 启动功能深度审查 V2.0 | Functionality Deep Inspector |
| `/inspect --quick` | 快速检查（仅高优先级） | Functionality Deep Inspector |
| `/inspect --full` | 完整检查（所有功能点） | Functionality Deep Inspector |

### 🎯 项目验收
| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/acceptance` | 启动完整11×4矩阵验收 (含自动修复) | Project Acceptance Expert |
| `/acceptance --quick` | 快速验收（仅阶段1+2，不触发自动修复） | Project Acceptance Expert |
| `/acceptance --dim=1,3,5` | 验收指定维度（所有阶段） | Project Acceptance Expert |
| `/acceptance --phase=1` | 仅执行指定阶段（所有维度） | Project Acceptance Expert |
| `/acceptance --cell=1-1,3-2` | 验收指定矩阵单元格 | Project Acceptance Expert |
| `/acceptance --no-fix` | 验收但不自动修复 | Project Acceptance Expert |
| `/acceptance --fix-only` | 仅执行修复循环（基于上次结果） | Project Acceptance Expert |
| `/acceptance --report` | 查看最近验收报告 | Project Acceptance Expert |
| `/acceptance --history` | 查看验收历史 | Project Acceptance Expert |

### 🧹 项目维护
| 指令 | 功能 | 所属 Skill |
|------|------|----------|
| `/cleanup` | 自动清理项目（含根目录外溢检测） | AutoCleanup |
| `/cleanup dry-run` | 预览清理内容 | AutoCleanup |
| `/cleanup --no-git` | 清理但不提交 Git | AutoCleanup |
| `/cleanup --deep` | 深度清理（含文件夹深度清理） | AutoCleanup |
| `/cleanup --dirs-only` | 仅清理目录 | AutoCleanup |

================================================================================
## 🎯 Intent 自动触发表
================================================================================

| 用户意图 | 触发关键词 | 自动执行的 Skill 序列 |
|---------|-----------|---------------------|
| 新项目启动 | "开始新项目" "新项目" "从零开始" | cost-control → socratic-inquiry → task-planner → doc-system |
| 功能开发 | "开发新功能" "添加功能" "实现功能" | cost-control → task-planner → workflow → code-review → doc-system |
| TDD 循环 | "TDD 模式" "循环开发" "先写测试" | cost-control → tdd-loop (红→绿→重构) |
| 代码重构 | "重构" "优化代码" "重构 {文件名}" | cost-control → code-review → task-planner → code-refactor |
| Bug 修复 | "修复bug" "debug" "报错了" | cost-control → debug-diagnosis → danger-signals → code-review |
| 设计还原 | "还原设计" "设计稿" "截图转代码" | cost-control → visual-coding → task-planner → code-review |
| 文档整理 | "整理文档" "处理文档" "文档太大" | cost-control → doc-processor → 整合 |
| 代码提交 | "提交代码" "commit" "写commit" | cost-control → code-review → doc-system → git-commit |
| 健康检查 | "检查健康" "检查健康度" "状态检查" | cost-control → context-management → danger-signals → code-review → cost-control |
| 深度修复 | "BugHunter" "深度修复" "自动修复" | cost-control → bughunter-loop |
| 多任务调度 | "使用 subagent" "并行处理" | cost-control → multi-task-scheduler |
| 自动清理 | "清理项目" | cost-control → auto-cleanup |
| 项目验收 | "验收项目" "版本验收" "项目验收" | cost-control → project-acceptance |

================================================================================
## 📚 Skill 库说明
================================================================================

### 核心 Skill 清单（14个）

| # | Skill 名称 | 文件位置 | 说明 |
|---|-----------|---------|------|
| 00 | Skill 编排器 | `.clinerules` (内置) | Intent识别与自动触发 |
| 01 | 成本控制协议 | `skills/skill-01-cost-control.md` | Token消耗预估与控制 |
| 02 | 大文档分段处理 | `skills/skill-02-doc-processor.md` | 大文件智能分段 |
| 03 | 任务拆解与规划 | `skills/skill-03-task-planner.md` | 复杂任务拆解与阶段管理 |
| 04 | 代码审查协议 | `skills/skill-04-code-review.md` | 代码质量检查 |
| 05 | 需求审问与项目启动 | `skills/skill-05-socratic-inquiry.md` | 苏格拉底式需求澄清 |
| 06 | 文档三轨与提交系统 | `skills/skill-06-doc-system.md` | KIMI/progress/memory三轨管理 |
| 07 | 调试诊断协议 | `skills/skill-07-debug-diagnosis.md` | Bug根因分析与修复 |
| 08 | 危险信号检测 | `skills/skill-08-danger-signals.md` | 上下文满载与重复内容检测 |
| 09 | BugHunter V2.0 | `skills/skill-09-bughunter.md` | 12维度深度代码诊断 (200+检查项) |
| 10 | 多任务调度器 | `skills/skill-10-multi-task-scheduler.md` | SubAgent并行处理 |
| 11 | 自动清理 V2.5 | `skills/skill-11-autocleanup.md` | 项目文件自动整理（根目录全域+文件夹清理） |
| 12 | 系统健康检查 | `skills/skill-12-health-check.md` | 健康度综合评估 |
| 13 | 功能深度审查器 V2.0 | `skills/skill-13-deep-inspector.md` | 8维度功能完整度检查 (100+检查项) |
| 14 | 第三方验收专家 V3.5 | `skills/skill-14-project-acceptance.md` | 11维度×四阶段矩阵验收+自动修复循环 |

### Skill 分类索引

```
📋 项目启动阶段 (3个)
├── Skill 00: Skill 编排器 - Intent识别与自动触发
├── Skill 01: 成本控制协议 - 预算管理与消耗监控
└── Skill 05: 需求审问与项目启动 - 苏格拉底式需求澄清

🚀 开发实施阶段 (4个)
├── Skill 03: 任务拆解与规划 - 复杂任务分阶段执行
├── Skill 10: 多任务调度器 - SubAgent并行处理
├── Skill 04: 代码审查协议 - 代码质量检查
└── Skill 06: 文档三轨与提交系统 - 文档管理与Git提交

🐛 质量保证阶段 (5个)
├── Skill 07: 调试诊断协议 - Bug修复与根因分析
├── Skill 08: 危险信号检测 - 上下文与消耗监控
├── Skill 09: BugHunter V2.0 - 自主代码诊断修复
├── Skill 12: 系统健康检查 - 整体健康度评估
└── Skill 14: 第三方验收专家 V3.5 - 11维度项目验收

🔧 维护优化阶段 (2个)
├── Skill 02: 大文档分段处理 - 大文件分批处理
└── Skill 11: 自动清理 V2.5 - 项目文件自动整理
```

================================================================================
## ⚠️ Skill 更新同步强制规则
================================================================================

**每当修改任何 Skill 时，必须同步更新以下文件：**

```markdown
- [ ] 1. .clinerules（触发关键词/快捷指令）
- [ ] 2. .clinerules/skills/skill-XX-xxx.md（详细定义）
- [ ] 3. .kimi/skills/xxx/skill-XX-xxx.md（如存在Kimi版本）
- [ ] 4. .clinerules/USAGE.md（快捷指令表）
- [ ] 5. 最后更新时间
```

**违规后果**：技能定义不一致，导致不同编辑器行为差异

================================================================================
## 🎯 Skill 快速选择指南
================================================================================

### 场景1: 开始新项目
```
你说: "开始新项目"
系统自动: 编排器 → 成本控制 → 需求审问 → 任务规划
```

### 场景2: 开发新功能
```
你说: "开发新功能"
系统自动: 成本控制 → 任务规划 → 代码审查 → 文档提交
```

### 场景3: 修复Bug
```
你说: "报错了" 或 "修复bug"
系统自动: 成本控制 → 调试诊断 → 危险信号 → 代码审查
```

### 场景4: 检查代码质量
```
你说: "深度检查功能完整度" → Skill 13
你说: "BugHunter" → Skill 09
你说: "检查健康度" → Skill 12
```

### 场景5: 项目验收
```
你说: "验收项目" → Skill 14
系统执行: 11×4矩阵验收（11维度 × 四阶段 = 44个检查点）
```

### 场景6: 项目整理
```
你说: "清理项目" → Skill 11
系统执行: 根目录全域扫描清理（含外溢文件检测）
```

================================================================================
## 📊 Skill 检查项统计
================================================================================

| 类别 | Skill 数量 | 检查项总数 |
|------|-----------|-----------|
| 🔍 代码质量 | 3个 | 300+项 |
| 🐛 调试诊断 | 2个 | 11项 |
| 📋 规划文档 | 4个 | - |
| 💰 成本监控 | 2个 | - |
| 🎯 编排调度 | 2个 | - |
| 🧹 项目维护 | 1个 | - |
| **总计** | **14个** | **300+项** |

================================================================================
*配置版本: 2.2 | 最后更新: 2026-03-12 | 核心 Skill: 14个*
