# Skill 使用指南

> 本项目 Skill 库使用指南 - 快速查找和使用各类 Skill

---

## 📋 快捷指令表

### 🎯 验收与质量

| 指令 | 功能 | 使用场景 |
|------|------|----------|
| `/acceptance` | 启动完整11维度验收（含自动修复） | 大版本发布前、项目里程碑 |
| `/acceptance --quick` | 快速验收（仅关键维度，不修复） | 日常检查、快速验证 |
| `/acceptance --dim=1,3,11` | 验收指定维度 | 针对性检查 |
| `/acceptance --no-fix` | 验收但不自动修复 | 人工控制修复 |
| `/acceptance --fix-only` | 仅执行修复循环 | 基于上次结果修复 |
| `/acceptance --report` | 查看最近验收报告 | 查看结果 |
| `/acceptance --history` | 查看验收历史 | 趋势分析 |

### 🔍 代码质量

| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/bughunter` | 启动 BugHunter 默认模式 | Skill 9 |
| `/bughunter --high` | 仅检查高优先级问题 | Skill 9 |
| `/bughunter --dim=security` | 检查指定维度 | Skill 9 |
| `/bughunter --scan-only` | 仅扫描不修复 | Skill 9 |
| `/inspect` | 功能深度审查 | Skill 13 |
| `/inspect --quick` | 快速检查（仅高优先级） | Skill 13 |
| `/inspect --full` | 完整检查（所有功能点） | Skill 13 |

### 💰 成本与监控

| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/cost` | 显示当前累计消耗 | Skill 1 |
| `/health` | 系统健康检查 | Skill 12 |
| `/health --fix` | 自动修复可修复的问题 | Skill 12 |

### 📋 规划与文档

| 指令 | 功能 | 所属 Skill |
|------|------|-----------|
| `/plan` | 重新生成计划 | Skill 3 |
| `/next` | 继续下一阶段 | Skill 3 |
| `/parallel` | 启动多任务调度 | Skill 10 |
| `/memory` | 更新 memory.md | Skill 6 |

### 🧹 项目维护

| 指令 | 功能 | 所属 Skill |
|------|------|----------|
| `/cleanup` | 执行自动清理（含根目录外溢检测） | Skill 11 |
| `/cleanup dry-run` | 预览清理内容 | Skill 11 |
| `/cleanup --deep` | 深度清理（含文件夹清理） | Skill 11 |
| `/cleanup --dirs-only` | 仅清理目录 | Skill 11 |

---

## 🎯 Skill 触发关键词

### 自动触发关键词

| 关键词 | 触发 Skill |
|--------|-----------|
| "验收项目", "版本验收", "项目验收" | Skill 14: 第三方验收专家 |
| "BugHunter", "深度修复", "自动修复" | Skill 9: BugHunter |
| "深度检查功能完整度", "扫描空代码" | Skill 13: 功能深度审查器 |
| "检查健康", "健康检查", "项目体检" | Skill 12: 系统健康检查 |
| "清理项目", "整理文件" | Skill 11: 自动清理 |
| "使用 subagent", "并行处理" | Skill 10: 多任务调度器 |
| "开始新项目", "新项目", "从零开始" | Skill 5: 需求审问与项目启动 |
| "开发新功能", "添加功能", "实现功能" | Skill 3: 任务拆解与规划 |
| "修复bug", "debug", "报错了" | Skill 7: 调试诊断协议 |
| "重构", "优化代码" | Skill 4: 代码审查协议 |

---

## 📊 Intent 自动触发表

| 用户意图 | 自动执行的 Skill 序列 |
|---------|---------------------|
| **新项目启动** | cost-control → socratic-inquiry → task-planner → doc-system |
| **功能开发** | cost-control → task-planner → workflow → code-review → doc-system |
| **TDD 模式** | cost-control → tdd-loop (红→绿→重构) |
| **代码重构** | cost-control → code-review → task-planner → code-refactor |
| **Bug 修复** | cost-control → debug-diagnosis → danger-signals → code-review |
| **设计还原** | cost-control → visual-coding → task-planner → code-review |
| **文档整理** | cost-control → doc-processor → 整合 |
| **代码提交** | cost-control → code-review → doc-system → git-commit |
| **健康检查** | cost-control → context-management → danger-signals → code-review → cost-control |
| **深度修复** | cost-control → bughunter-loop |
| **多任务调度** | cost-control → multi-task-scheduler |
| **自动清理** | cost-control → auto-cleanup |
| **项目验收** | cost-control → acceptance-expert → auto-cleanup |

---

## 📚 Skill 库说明

### 核心 Skill 列表 (14个)

#### 🎯 编排与调度 (2个)
- **Skill 0**: Skill 编排器 - Intent识别与自动触发
- **Skill 10**: 多任务调度器 - SubAgent并行处理

#### 💰 成本与监控 (2个)
- **Skill 1**: 成本控制协议 - Token消耗预估与控制
- **Skill 8**: 危险信号检测 - 上下文满载与重复内容检测

#### 📋 规划与文档 (4个)
- **Skill 2**: 大文档分段处理 - 大文件分批处理
- **Skill 3**: 任务拆解与规划 - 复杂任务拆解与阶段管理
- **Skill 5**: 需求审问与项目启动 - 苏格拉底式需求澄清
- **Skill 6**: 文档三轨与提交系统 - KIMI/progress/memory三轨管理

#### 🔍 代码质量 (3个)
- **Skill 4**: 代码审查协议 - 可读性/安全/类型检查
- **Skill 9**: BugHunter V2.0 - 12维度深度代码诊断 (200+检查项)
- **Skill 13**: 功能深度审查器 V2.0 - 8维度功能完整度检查 (100+检查项)

#### 🐛 调试与诊断 (2个)
- **Skill 7**: 调试诊断协议 - Bug根因分析与修复
- **Skill 12**: 系统健康检查 - 健康度综合评估

#### 🧹 项目维护 (1个)
- **Skill 11**: 自动清理 V2.5 - 临时文件、空目录、重复文件夹清理

#### ✅ 质量保证
- **Skill 14**: 第三方验收专家 V3.5 - 11维度项目验收 + 自动修复循环

### 备用 Skill 库
- **位置**: `.clinerules.skill-library.md`
- **数量**: 18个扩展 Skill
- **加载方式**: 说"加载 Skill XX"或"从备用库加载 XX"

---

## 🚀 快速开始

### 场景1: 项目验收

```bash
# 完整验收
/acceptance

# 快速验收（仅关键维度）
/acceptance --quick

# 验收指定维度
/acceptance --dim=1,3,11
```

### 场景2: 代码质量检查

```bash
# BugHunter 全面扫描
/bughunter

# 仅检查高优先级问题
/bughunter --high

# 功能深度审查
/inspect --quick
```

### 场景3: 项目清理

```bash
# 预览清理内容
/cleanup dry-run

# 执行清理
/cleanup
```

---

## 📁 验收报告使用指南

### 报告位置

```
ai-test-platform/docs/07-验收报告/
├── README.md                          # 验收报告索引
└── acceptance-YYYYMMDD-XXX/           # 验收批次
    ├── summary.md                     # Markdown报告 (带目录索引)
    ├── summary.html                   # HTML可视化报告 (侧边导航)
    ├── acceptance-config.json         # 验收配置
    └── attachments/                   # 附件
```

### 报告特点

1. **Markdown 报告** (`summary.md`)
   - 带完整目录索引
   - 支持锚点跳转
   - 轻量级，适合代码仓库浏览

2. **HTML 报告** (`summary.html`)
   - 侧边栏导航
   - 可折叠章节
   - 仪表盘展示
   - 适合展示和打印

### 通过标准

| 标准 | 要求 | 说明 |
|------|------|------|
| 高优先级漏洞 | = 0 | 无阻断性功能缺陷 |
| 中优先级漏洞 | = 0 | 无影响体验的缺陷 |
| 测试覆盖率 | ≥ 99% | 核心代码全覆盖 |
| API平均响应 | < 3s | 后端性能达标 |
| 页面加载时间 | < 3s | 前端性能达标 |
| 工作流通过率 | = 100% | 业务流程完整 |

---

## 🔧 工作流完整性验收

### 第11维度 - 工作流完整性

验证系统内工作流是否完整，是否能按照角色执行各自工作步骤。

#### 核心检查点

1. **端到端业务流程验证**
   - 测试用例设计工作流程
   - 缺陷管理工作流程
   - AI测试生成工作流程

2. **角色权限正确性检查**
   - 超级管理员、项目经理、测试负责人
   - 测试工程师、开发工程师、只读用户
   - 权限矩阵验证

3. **数据完整性检查**
   - 数据流转完整性
   - 数据关联正确性
   - 状态机流转验证

4. **工作流步骤可执行性**
   - UI可交互性
   - 操作反馈及时性
   - 并发与协作

5. **边界与异常场景**
   - 边界条件处理
   - 异常恢复机制
   - 特殊场景支持

---

## 📝 项目清理说明

### 验收后自动清理内容

1. **清理测试过程文档**
   - 删除临时文件: temp*.txt, test-output.txt, *.log
   - 移动测试执行文件到归档目录

2. **文档分类整理**
   - 生成的代码文档 → 移动到对应代码目录
   - 过程性文档 → docs/99-历史归档/
   - 更新文档索引

3. **保持总结性文档纯净**
   - 架构设计文档: 只保留最终结论，移除过程信息
   - PRD文档: 只保留需求定义，移除讨论过程
   - 技术方案: 只保留决策结果，移除备选方案分析

---

## 💡 最佳实践

### 何时使用验收专家

- ✅ 大版本发布前
- ✅ 重要功能上线前
- ✅ 每周/每月定期检查
- ✅ CI/CD 流水线最后阶段

### 验收不通过怎么办

1. 根据报告中的高优先级问题清单进行修复
2. 修复完成后重新执行验收
3. 对比历史验收记录，追踪改进趋势

### 如何对比多次验收结果

```bash
# 查看验收历史
/acceptance --history
```

---

## 📞 帮助与支持

如有问题，请参考：
- `.clinerules` - 完整 Skill 定义
- `.kimi/skills/project-acceptance/` - 验收专家配置文件
- `ai-test-platform/docs/07-验收报告/README.md` - 验收报告索引

---

*最后更新: 2026-03-12*  
*版本: v1.1*
