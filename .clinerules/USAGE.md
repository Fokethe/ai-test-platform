# encoding: utf-8
# -*- coding: utf-8 -*-

# Cline 技能使用指南
# 版本: 2.5 | 最后更新: 2026-03-16

================================================================================
## 🚀 快捷指令总表
================================================================================

### 🎯 编排与调度
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|-----------|------|
| `/plan` | 重新生成计划 | Task Planner | `core/task-planner/` |
| `/parallel` | 启动多任务调度 | Multi-Task Scheduler | `dev/multi-task-scheduler/` |
| `/next` | 继续下一阶段/下一块 | Task Planner / Doc Processor | `core/` |
| `/yolo` | 进入自动执行模式（无需确认） | Global Tools | `core/skill-orchestrator/` |

### 💰 成本与监控
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|-----------|------|
| `/cost` | 显示当前累计消耗 | Cost Control | `core/cost-control/` |
| `/health` | 系统健康检查 | System Health Check | `quality/health-check/` |
| `/health --fix` | 自动修复可修复的问题 | System Health Check | `quality/health-check/` |

### 📋 规划与文档
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|-----------|------|
| `/memory` | 更新 memory.md | Doc System | `core/doc-system/` |
| `/compact` | 压缩上下文（自动保存状态） | Global Tools | `core/skill-orchestrator/` |

### 🔍 代码质量 (quality/)
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|-----------|------|
| `/bughunter` | 启动 BugHunter V2.0 | BugHunter | `quality/bughunter/` |
| `/bughunter --high` | 仅检查高优先级问题 | BugHunter | `quality/bughunter/` |
| `/bughunter --dim=<维度>` | 检查指定维度 | BugHunter | `quality/bughunter/` |
| `/bughunter --scan-only` | 仅扫描不修复 | BugHunter | `quality/bughunter/` |
| `/inspect` | 启动功能深度审查 V2.0 | Deep Inspector | `quality/deep-inspector/` |
| `/inspect --quick` | 快速检查（仅高优先级） | Deep Inspector | `quality/deep-inspector/` |
| `/inspect --full` | 完整检查（所有功能点） | Deep Inspector | `quality/deep-inspector/` |

### 🎯 项目验收 (quality/)
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|-----------|------|
| `/acceptance` | 启动44检查点全自动验收 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --quick` | 快速验收（仅阶段1+2） | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --dim=1,3,5` | 验收指定维度 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --phase=1` | 仅执行指定阶段 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --cell=1-1,3-2` | 验收指定矩阵单元格 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --no-fix` | 验收但不自动修复 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --fix-only` | 仅执行修复循环 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --report` | 查看最近验收报告 | Project Acceptance | `quality/project-acceptance/` |
| `/acceptance --history` | 查看验收历史 | Project Acceptance | `quality/project-acceptance/` |

### 🧹 项目维护 (dev/)
| 指令 | 功能 | 所属 Skill | 路径 |
|------|------|----------|------|
| `/cleanup` | 自动清理项目 | AutoCleanup | `dev/auto-cleanup/` |
| `/cleanup dry-run` | 预览清理内容 | AutoCleanup | `dev/auto-cleanup/` |
| `/cleanup --no-git` | 清理但不提交 Git | AutoCleanup | `dev/auto-cleanup/` |
| `/cleanup --deep` | 深度清理 | AutoCleanup | `dev/auto-cleanup/` |
| `/cleanup --dirs-only` | 仅清理目录 | AutoCleanup | `dev/auto-cleanup/` |

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
| 项目验收 | "验收项目" "版本验收" "项目验收" | cost-control → project-acceptance (44检查点全自动+YOLO模式+SubAgent修复循环) |

================================================================================
## 📚 Skill 库说明（新分类结构）
================================================================================

### core/ - 核心基础 (5个)
| # | Skill 名称 | 路径 | 说明 |
|---|-----------|------|------|
| 00 | Skill 编排器 | `core/skill-orchestrator/` | 意图识别与Skill序列编排 |
| 01 | 成本控制协议 | `core/cost-control/` | 预算管理与消耗监控 |
| 02 | 大文档分段处理 | `core/doc-processor/` | 大文件智能分段处理 |
| 03 | 任务拆解与规划 | `core/task-planner/` | 复杂任务拆解与阶段管理 |
| 06 | 文档三轨与提交系统 | `core/doc-system/` | KIMI/progress/memory三轨管理 |

### quality/ - 质量保证 (5个)
| # | Skill 名称 | 路径 | 说明 |
|---|-----------|------|------|
| 04 | 代码审查协议 | `quality/code-review/` | 代码质量检查 |
| 09 | BugHunter V2.0 | `quality/bughunter/` | 12维度深度代码诊断 |
| 12 | 系统健康检查 | `quality/health-check/` | 整体健康度评估 |
| 13 | 功能深度审查器 | `quality/deep-inspector/` | 8维度功能完整度检查 |
| 14 | 第三方验收专家 V5.0 | `quality/project-acceptance/` | 56检查点+运行时验证 |

### debug/ - 调试诊断 (2个)
| # | Skill 名称 | 路径 | 说明 |
|---|-----------|------|------|
| 07 | 调试诊断协议 | `debug/debug-diagnosis/` | Bug修复与根因分析 |
| 08 | 危险信号检测 | `debug/danger-signals/` | 上下文与消耗监控 |

### dev/ - 开发效率 (6个)
| # | Skill 名称 | 路径 | 说明 |
|---|-----------|------|------|
| 05 | 需求审问与项目启动 | `dev/socratic-inquiry/` | 苏格拉底式需求澄清 |
| 10 | 多任务调度器 | `dev/multi-task-scheduler/` | SubAgent并行处理 |
| 11 | 自动清理 V2.5 | `dev/auto-cleanup/` | 项目文件自动整理 |
| - | MCP 构建器 | `dev/mcp-builder/` | MCP服务器开发指南 |
| - | Web 产物构建器 | `dev/web-artifacts-builder/` | Web构建产物处理 |
| - | Web 应用测试 | `dev/webapp-testing/` | Web应用测试指南 |

### design/ - 设计类 (2个)
| Skill 名称 | 路径 | 说明 |
|-----------|------|------|
| 前端设计 | `design/frontend-design/` | 创建高质量前端界面 |
| 主题工厂 | `design/theme-factory/` | 主题生成和管理 |

### productivity/ - 生产力 (7个)
| Skill 名称 | 路径 | 说明 |
|-----------|------|------|
| Skill 创建器 | `productivity/skill-creator/` | 创建和改进Skills |
| 基于文档的测试用例生成 | `productivity/doc-based-testcase-generator/` | 从文档生成测试用例 |
| 文档协作 | `productivity/doc-coauthoring/` | 多人文档协作 |
| Word处理 | `productivity/docx/` | Word文档自动化 |
| PDF处理 | `productivity/pdf/` | PDF文档自动化 |
| PPT处理 | `productivity/pptx/` | PPT文档自动化 |
| Excel处理 | `productivity/xlsx/` | Excel文档自动化 |

### archive/ - 历史归档
| 名称 | 路径 | 说明 |
|------|------|------|
| 备用 Skill 库 | `archive/skill-library/` | 18个扩展Skill备用库 |

### Skill 分类索引

```
🛠️ 基础工具 (1个)
└── Skill 00: 全局基础工具 - 路径验证+编码修复+检查点追踪+同步清单

📋 项目启动阶段 (3个)
├── Skill 01: 成本控制协议 - 预算管理与消耗监控
├── Skill 05: 需求审问与项目启动 - 苏格拉底式需求澄清
└── Skill 03: 任务拆解与规划 - 复杂任务分阶段执行

🚀 开发实施阶段 (4个)
├── Skill 04: 代码审查协议 - 代码质量检查
├── Skill 06: 文档三轨与提交系统 - 文档管理与Git提交
├── Skill 10: 多任务调度器 - SubAgent并行处理
└── Skill 02: 大文档分段处理 - 大文件分批处理

🐛 质量保证阶段 (5个)
├── Skill 07: 调试诊断协议 - Bug修复与根因分析
├── Skill 08: 危险信号检测 - 上下文与消耗监控
├── Skill 09: BugHunter V2.0 - 自主代码诊断修复
├── Skill 12: 系统健康检查 - 整体健康度评估
└── Skill 14: 第三方验收专家 V5.0 - 56检查点+运行时验证+严格模式+YOLO/Compact实际执行

🔧 维护优化阶段 (2个)
├── Skill 11: 自动清理 V2.5 - 项目文件自动整理
└── Skill 13: 功能深度审查器 V2.0 - 8维度功能完整度检查
```

================================================================================
## ⚠️ Skill 更新同步强制规则
================================================================================

**每当修改任何 Skill 时，必须同步更新以下文件：**

```markdown
- [ ] 1. .clinerules（触发关键词/快捷指令）
- [ ] 2. .clinerules/skills/{category}/{skill-name}/SKILL.md（详细定义）
- [ ] 3. .kimi/skills/{skill-name}/SKILL.md（如存在Kimi版本）
- [ ] 4. .clinerules/USAGE.md（快捷指令表）
- [ ] 5. .clinerules/skills/README.md（总览文档）
- [ ] 6. 最后更新时间
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
你说: "深度检查功能完整度" → Skill 13 (quality/deep-inspector/)
你说: "BugHunter" → Skill 09 (quality/bughunter/)
你说: "检查健康度" → Skill 12 (quality/health-check/)
```

### 场景5: 项目验收
```
你说: "验收项目" → Skill 14 (quality/project-acceptance/)
系统执行: 44检查点全自动验收（11维度 × 四阶段）+ YOLO模式 + SubAgent TDD自动修复循环
```

### 场景6: 项目整理
```
你说: "清理项目" → Skill 11 (dev/auto-cleanup/)
系统执行: 根目录全域扫描清理（含外溢文件检测）
```

### 场景7: 使用新增 Skill
```
你说: "创建新 skill" → productivity/skill-creator/
你说: "构建 MCP 服务器" → dev/mcp-builder/
你说: "设计前端界面" → design/frontend-design/
你说: "处理 Excel 文件" → productivity/xlsx/
```

================================================================================
## 📊 Skill 检查项统计
================================================================================

| 分类 | Skill 数量 | 检查项总数 |
|------|-----------|-----------|
| 🔍 代码质量 | 3个 | 300+项 |
| 🐛 调试诊断 | 2个 | 11项 |
| 📋 规划文档 | 4个 | - |
| 💰 成本监控 | 2个 | - |
| 🎯 编排调度 | 2个 | - |
| 🧹 项目维护 | 1个 | - |
| **总计** | **~28个** | **300+项** |

================================================================================
*配置版本: 2.5 | 最后更新: 2026-03-16 | 核心 Skill: 28个 (新分类结构)*
