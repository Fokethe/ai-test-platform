# encoding: utf-8

# Kimi Code Skills 使用指南

## 🚀 新方式：Intent 自动触发（推荐）

**无需输入 `/skill:xxx` 命令！** 直接描述你想做什么，Skill 编排器会自动识别意图并执行完整的 Skill 序列。

```
你说: "我要开发用户登录功能"
AI 自动: cost-control → task-planner → code-review → doc-system

你说: "报错了，帮我 debug"
AI 自动: cost-control → debug-diagnosis → danger-signals → code-review

你说: "开始新项目"
AI 自动: cost-control → socratic-inquiry → task-planner → doc-system
```

**完整关键词表见下方 "Intent 自动触发" 部分。**

---

## 快速调用命令

### 🎯 快捷指令（推荐）

```bash
# 💰 查看消耗
/cost

# 📦 压缩上下文
/compact

# ⏭️ 继续下一阶段/下一块
/next

# 📋 重新生成计划
/plan

# 🔄 启动多任务调度
/parallel

# 🐛 启动 BugHunter
/bughunter
```

### 基础调用方式（按需加载 Skill）

```bash
# 从备用库加载特定 Skill
"从备用库加载 Skill 11"  → 加载视觉还原协议
"从备用库加载 TDD 开发"  → 加载 TDD 循环开发
"显示所有可用 Skill"      → 列出所有 Skill 清单
```

---

## Skill 触发关键词速查

### 方式一：Intent 自动触发（推荐）

说出场景关键词，**Skill 编排器** 自动执行完整序列：

| 你想做什么 | 说这些关键词 | 自动触发的 Skill 序列 |
|-----------|-------------|---------------------|
| **开始新项目** | "开始新项目"、"从零开始" | cost-control → socratic-inquiry → task-planner → doc-system |
| **功能开发** | "开发新功能"、"添加功能" | cost-control → task-planner → code-review → doc-system |
| **TDD 开发** | "TDD 模式"、"先写测试" | cost-control → tdd-loop (红→绿→重构循环) |
| **重构代码** | "重构代码"、"优化代码" | cost-control → code-review → task-planner → code-refactor |
| **Bug 修复** | "修复 bug"、"报错了" | cost-control → debug-diagnosis → danger-signals → code-review |
| **还原设计** | "还原设计"、"截图转代码" | cost-control → visual-coding → task-planner → code-review |
| **整理文档** | "整理文档"、"文档太大" | cost-control → doc-processor → 逐块处理 → 整合 |
| **代码提交** | "提交代码"、"commit" | cost-control → code-review → doc-system → git-commit |
| **健康检查** | "检查健康度"、"项目体检" | cost-control → context-management → danger-signals → code-review |
| **深度修复** | "BugHunter"、"深度修复" | cost-control → bughunter-loop (扫描→分析→修复→验证→迭代) |
| **多任务调度** | "使用 subagent"、"并行处理" | cost-control → multi-task-scheduler |

### 方式二：单个 Skill 触发

无需记忆命令，说出以下关键词即可自动触发单个 Skill：

| 你想做什么 | 说这些关键词 | 自动触发 Skill |
|-----------|-------------|---------------|
| 查看消耗 | "/cost"、"查一下用了多少 token" | cost-control |
| 处理大文档 | "整理这个文档"、"文件太大了" | doc-processor |
| 重构代码 | "重构这个文件"、"优化代码" | code-refactor |
| 规划任务 | "帮我做个计划" | task-planner |
| 审查代码 | "看看这代码有问题吗"、"review" | code-review |
| 写提交信息 | "怎么提交"、"写 commit" | git-commit |
| 了解项目规范 | "按项目规范"、"文档里说的" | project-context |
| 澄清需求 | "我要做个新项目"、"需求不太清楚" | socratic-inquiry |
| 初始化文档 | "创建项目文档"、"初始化" | doc-system |
| 开始开发 | "开始开发" | workflow |
| 还原设计稿 | "实现这个设计"、"截图转代码" | visual-coding |
| 修复错误 | "报错了"、"修复这个错误" | debug-diagnosis |
| 总结进度 | "/compact"、"总结下进度" | context-management |

---

## 💡 高级使用技巧

### 1. Plan Mode 工作流（复杂任务必备）

**核心原则：先规划，后执行，方案留底**

```
Step 1: 进入 Plan Mode
        ↓ 说"进入 Plan Mode" 或 "先规划再执行"
        AI 只分析不修改，输出详细计划

Step 2: 保存计划
        ↓ 说"先把计划保存到 plan.md"
        方案留底，后续可回溯

Step 3: Review 计划（可选）
        ↓ 说"扮演 Staff Engineer 审查这个计划"
        第二视角检查方案可行性

Step 4: 执行计划
        ↓ 确认后说"开始执行"
        按 plan.md 逐步实施
```

**何时用 Plan Mode**：
- 接手新项目 → 出架构图 + 入口分析
- 做大功能 → 模块拆分、接口设计
- 重构优化 → 分析问题，给出方案
- **进展跑偏时** → 立即切回 Plan Mode 重新规划

---

### 2. 提升 Prompt 质量的话术

| 目的 | Prompt 话术 |
|------|------------|
| **角色反转** | "针对这些改动向我提问，在我通过你的测试之前不要提交" |
| **要求自证** | "证明这套方案行得通，对比修改前后的差异" |
| **推倒重来** | "基于你现在掌握的信息，推翻刚才的方案，换一个更优雅的实现" |
| **先写 Spec** | "先写详细的规格说明 Spec，确认后再动手实现" |
| **解释模式** | "边改边解释为什么这么改，开启解释模式" |
| **架构可视化** | "给我画个 ASCII 流程图，解释模块调用链" |
| **费曼学习** | "我解释给你听，你通过提问填补我的知识盲区" |

---

### 3. 成本控制最佳实践

| 策略 | 操作 |
|------|------|
| **长任务定期压缩** | 每 10-15 轮说 `/compact`，别等报错才后悔 |
| **切模型省成本** | 简单任务（格式化、注释）明确说"用轻量模式" |
| **监控消耗** | 长对话必说 `/cost`，避免超额 |
| **大文件分段** | 文档 > 30,000 字符自动触发分段处理 |

---

### 4. 使用扩展 Skill

当需要精简版之外的 Skill 时：

```
用户：从备用库加载 Skill 11

AI: [读取 .clinerules.skill-library.md 中的 Skill 11]
    🎯 已加载: 视觉还原协议 (Skill 11)
    
    【触发方式】: 用户上传图片/截图后说"还原这个界面"...
    【执行流程】: 结构分析 → 设计规范提取 → 像素级还原 → ...
    
    现在可以使用视觉还原功能了！

用户：[上传截图] 还原这个界面

AI: [执行 Skill 11 视觉还原协议]
    📐 结构分析: 这是一个登录页面...
    🎨 设计规范提取: 主色 #3b82f6, 字体 Inter...
    💻 代码实现: [生成的 React/Tailwind 代码]
```

---

## 使用示例

### 示例 1：完整功能开发（含规划）

```
用户：开发用户登录功能

AI: [自动执行 cost-control → task-planner]
    📊 当前消耗: $0.012
    
    [task-planner 启动]
    📋 执行计划: 用户登录功能
    预估总消耗: $0.08 | 预计 12 轮对话
    
    阶段 1: API 设计
    - 登录接口 → 产出: app/api/auth/login/route.ts
    
    阶段 2: 页面实现  
    - 登录页 → 产出: app/login/page.tsx
    
    确认执行计划? [Y/N/调整]

用户：Y

AI: [自动执行 workflow → code-review → doc-system → cost-control]
    阶段 1 完成 ✓
    阶段 2 完成 ✓
    [code-review] 代码审查通过
    📊 本轮总消耗: $0.076
```

---

### 示例 2：Bug 修复（自动诊断）

```
用户：报错了，帮我修复

AI: [自动执行 cost-control → debug-diagnosis → danger-signals]
    📊 当前消耗: $0.045
    
    [debug-diagnosis] 分析中...
    根因：projectId 无效导致外键约束失败
    修复方案：从 URL 参数获取 projectId
    
    [danger-signals] ⚠️ 第 1 次修复，继续

用户：确认修复

AI: [自动执行 code-review → doc-system → cost-control]
    ✓ 修复完成
    📊 Debug 成本: $0.023
```

---

### 示例 3：健康检查（防止失忆）

```
用户：检查健康度

AI: [自动执行 cost-control → context-management → danger-signals → code-review → cost-control]
    📊 当前消耗: $0.089
    
    [context-management] 上下文已压缩
    当前进度: 测试管理功能开发完成 80%
    
    [danger-signals] 🚨 检测到信号:
    - 上下文占用 > 60%
    - 建议执行 /compact 或新开会话
    
    [code-review] 健康度检查:
    - 测试覆盖率: 87%
    - 类型错误: 27 个（非阻塞）
    - 构建状态: ✅
    
    📊 会话总结: $0.089 / 15 轮
```

---

### 示例 4：使用多任务调度（SubAgent）

```
用户：并行处理这 3 个任务：1) 重构 utils 2) 优化组件 3) 修复 bug

AI: [自动执行 cost-control → multi-task-scheduler]
    📊 当前消耗: $0.015
    
    [multi-task-scheduler 启动]
    🔄 分析任务依赖关系...
    
    子任务 1: 重构 utils (优先级: 高)
    子任务 2: 优化组件 (优先级: 中, 依赖: 子任务 1)
    子任务 3: 修复 bug (优先级: 高)
    
    并行调度: 子任务 1 + 子任务 3
    然后执行: 子任务 2
    
    [启动 2 个 subagent 并行执行...]
    
    📊 批次 1/2 完成:
    - 子任务 1: ✅ utils 重构完成
    - 子任务 3: ✅ bug 修复完成
    
    📊 批次 2/2 完成:
    - 子任务 2: ✅ 组件优化完成
    
    📝 文档已更新:
    - kimi.batch-1.md
    - progress.batch-1.md
    
    📊 总消耗: $0.089
```

---

## 打断与跳过

在序列执行过程中：

- **说"跳过"** → 跳过当前 Skill，继续下一个
- **说"停止"** → 终止整个序列  
- **说"/cost"** → 立即显示消耗（不中断序列）
- **说"/plan"** → 立即进入 task-planner

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────────────────┐
│  🔥 Intent 自动触发（说出关键词即可）                            │
├─────────────────────────────────────────────────────────────────┤
│  "开始新项目"     → 🆕 审问 → 规划 → 文档                       │
│  "开发新功能"     → 🚀 规划 → 开发 → 审查 → 提交               │
│  "报错了"         → 🔧 诊断 → 修复 → 审查                      │
│  "重构代码"       → 🔧 审查 → 规划 → 重构 → 审查               │
│  "使用 subagent"  → 🔄 并行调度多任务                          │
│  "BugHunter"      → 🐛 深度扫描修复                            │
├─────────────────────────────────────────────────────────────────┤
│  快捷指令: /cost  /compact  /next  /plan  /parallel  /bughunter │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skill 库说明

### 核心 Skill（精简版 - 10个）
位于 `.clinerules`，覆盖 95% 日常开发场景：
- Skill 0: Skill 编排器
- Skill 1: 成本控制
- Skill 2: 大文档分段
- Skill 3: 任务拆解规划
- Skill 4: 代码审查
- Skill 5: 需求审问
- Skill 6: 文档与提交
- Skill 7: 调试诊断
- Skill 8: 危险信号
- Skill 9: BugHunter
- Skill 10: 多任务调度

### 备用 Skill 库（按需加载 - 18个）
位于 `.clinerules.skill-library.md`：
- Skill 11+: 视觉还原、TDD 循环、代码重构、持久化规划、上下文管理等

---

*配置版本: 2.0 | 最后更新: 2026-02-28 | 核心 Skill: 10个 | 备用 Skill: 18个*
