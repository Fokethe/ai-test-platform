# 🎯 统一命令封装（增强版）

## 一键触发复杂工作流

### 🔥 开发工作流（含 task-planner）

| 你说 | 触发的完整 Skill 序列 |
|-----|---------------------|
| **"开始新项目"** / **"新项目"** / **"从零开始"** | `/cost` → `socratic-inquiry` → `task-planner` → `doc-system` → `workflow` |
| **"开发新功能"** / **"添加功能"** / **"实现功能"** / **"做功能"** | `/cost` → `task-planner` → `workflow` → `code-review` → `doc-system` → `git-commit` → `/cost` |
| **"TDD 模式"** / **"循环开发"** / **"先写测试"** / **"红绿重构"** | `/cost` → `tdd-loop` (红→绿→重构→自动循环) |
| **"重构"** / **"优化代码"** / **"重构代码"** | `/cost` → `code-review` → `task-planner` → `code-refactor` → `code-review` → `git-commit` → `/cost` |
| **"修复bug"** / **"debug"** / **"报错"** / **"出错了"** | `/cost` → `debug-diagnosis` → `danger-signals` → `code-review` → `doc-system` → `git-commit` → `/cost` |

---

### 🔧 质量保障工作流

| 你说 | 触发的完整 Skill 序列 |
|-----|---------------------|
| **"检查健康"** / **"检查健康度"** / **"总结进度"** / **"防止失忆"** / **"状态检查"** | `/cost` → `context-management` → `danger-signals` → `code-review` → `doc-system` → `/cost` |
| **"提交代码"** / **"commit"** / **"写commit"** | `/cost` → `code-review` → `project-context` → `doc-system` → `git-commit` → `/cost` |
| **"review"** / **"审查代码"** / **"看看代码"** | `code-review` |

---

### 📋 规划与文档工作流（必含 task-planner）

| 你说 | 触发的完整 Skill 序列 |
|-----|---------------------|
| **"规划"** / **"plan"** / **"制定计划"** / **"任务规划"** | `task-planner` → `doc-system` |
| **"整理文档"** / **"处理大文档"** | `/cost` → `doc-processor` → 逐块处理 → `/cost` |
| **"还原设计"** / **"设计稿"** / **"截图转代码"** | `/cost` → `visual-coding` → `task-planner` → 分组件实现 → `code-review` → `git-commit` → `/cost` |

---

## 快捷指令（单 Skill）

| 指令 | 触发 Skill |
|-----|-----------|
| `/cost` / `查消耗` / `用了多少` | cost-control |
| `/compact` / `压缩` / `压缩上下文` | context-management |
| `/tdd` / `TDD` | tdd-loop |
| `/plan` / `plan` | task-planner |

---

## 💡 使用示例

### 示例1：完整功能开发（含规划）
```
用户：开发用户登录功能

AI: [自动执行 /cost → task-planner]
    📊 当前消耗: $0.012
    
    [task-planner 启动]
    📋 Execution Plan: 用户登录功能
    Est. total cost: $0.08 | ~12 rounds
    
    Phase 1: API 设计
    - 登录接口 → Output: app/api/auth/login/route.ts
    
    Phase 2: 页面实现  
    - 登录页 → Output: app/login/page.tsx
    
    确认执行计划? [Y/N/调整]

用户：Y

AI: [自动执行 workflow → code-review → git-commit → /cost]
    Phase 1 完成 ✓
    Phase 2 完成 ✓
    [code-review] 代码审查通过
    [git-commit] 生成 commit
    📊 本轮总消耗: $0.076
```

### 示例2：Bug 修复（自动诊断）
```
用户：报错了，帮我修复

AI: [自动执行 /cost → debug-diagnosis → danger-signals]
    📊 当前消耗: $0.045
    
    [debug-diagnosis] 分析中...
    根因：projectId 无效导致外键约束失败
    修复方案：从 URL 参数获取 projectId
    
    [danger-signals] ⚠️ 第 1 次修复，继续

用户：确认修复

AI: [自动执行 code-review → git-commit → /cost]
    ✓ 修复完成
    📊 Debug 成本: $0.023
```

### 示例3：健康检查（防止失忆）
```
用户：检查健康度

AI: [自动执行 /cost → context-management → danger-signals → code-review → /cost]
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

## ⚡ 打断与跳过

在序列执行过程中：
- **说"跳过"** → 跳过当前 skill，继续下一个
- **说"停止"** → 终止整个序列  
- **说"/cost"** → 立即显示消耗（不中断序列）
- **说"/plan"** → 立即进入 task-planner
