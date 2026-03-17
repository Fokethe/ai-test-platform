# encoding: utf-8
# -*- coding: utf-8 -*-

## Skill 14: 第三方验收专家 (Project Acceptance Expert) V6.0 - 分批SubAgent循环模式

【触发方式】: 
- 快捷指令: `/acceptance` (必须加斜杠)
- 用户输入: "验收项目"、"版本验收"、"项目验收"
- 自动触发: 大版本发布前、重大功能上线前

【核心定位】: 
**全自动第三方独立验收专家**，采用 **分批SubAgent并行检查 + 循环修复** 模式。
**关键特性**: 
- Step 1-5: 5个SubAgent并行检查，生成统一问题报告
- Step 6: 多SubAgent并行修复问题
- Step 7: 回归测试循环，直到所有问题清零
- Step 8: 精美HTML报告 + 自动打开

---

## 【基础工具引用】

本 Skill 使用 Skill 00 提供的基础工具：
- 路径验证器: 自动修正文件路径
- 编码修复器: 自动设置 UTF-8
- 检查点追踪器: 追踪56个检查点
- 同步检查清单: 确保更新同步

---

## 【⚠️ 执行前强制指令 - V6.0分批模式】

**当用户触发 `/acceptance` 或"验收项目"时，Cline 必须立即执行以下操作：**

### 1. 立即执行 /yolo 进入自动模式
```
🤖 验收专家已激活 - V6.0分批SubAgent模式
├── 模式: BATCH_SUBAGENT (分批并行)
├── 行为: 1-5步并行检查 → 6步并行修复 → 7步回归循环 → 8步报告
├── 通过标准: 56/56检查点 + 维度得分≥99分 + 问题清零
├── 中断策略: 上下文>80%时暂停，等待用户compact
└── 路径验证: 所有文件操作前验证路径
```
**立即执行**: 输入 `/yolo` 进入自动执行模式

### 2. 强制设置 UTF-8 编码 (自动执行)
```bash
chcp 65001
set LANG=zh_CN.UTF-8
```

### 3. 路径验证器初始化 (Step 0核心)
```typescript
// Step 0: 路径验证 - 确保项目路径正确
interface PathValidator {
  projectRoot: string;
  validatePath(filePath: string): string;
  ensureDirectory(dirPath: string): void;
}

const PATH_VALIDATOR = {
  projectRoot: 'ai-test-platform',
  reportDir: 'ai-test-platform/docs/07-验收报告',
  
  validatePath(filePath: string): string {
    // 确保路径包含项目根目录
    if (!filePath.includes(this.projectRoot)) {
      return `${this.projectRoot}/${filePath}`;
    }
    return filePath;
  },
  
  ensureReportDir(batchId: string): string {
    const dir = `${this.reportDir}/${batchId}`;
    // 自动创建目录
    return dir;
  }
};

// Step 0 必须执行：验证 ai-test-platform 目录存在
// 如果不存在，报错并停止验收
```

### 4. 检查点追踪器初始化
```typescript
interface CheckpointTracker {
  total: 56;                    // 总检查点数 (11维度 × 5阶段)
  completed: number;            // 已完成
  failed: number;               // 失败
  fixed: number;                // 已修复
  pending: number;              // 待修复
  status: Map<string, boolean>; // 每个检查点状态
}

// V6.0模式: 必须所有检查点通过 + 问题清零
const V6_MODE = {
  allowSkip: false,
  passThreshold: 100,   // 100%
  requireAllPass: true,
  requireZeroIssues: true,  // 新增: 问题必须清零
  stopOnContextLimit: true  // 新增: 上下文不足时暂停
};
```

---

## 【严格模式通过标准 V6.0】

```
✅ 强制满足 (缺一不可):
├── 检查点覆盖率 = 100% (56/56)
├── 维度得分 ≥ 99分
├── 问题修复率 = 100% (所有问题必须清零)
├── 高/中/低优先级漏洞 = 0
├── 11维度 × 5阶段 检查点通过率 = 100%
├── 运行时错误 = 0
├── API平均响应 < 3s
├── 页面加载时间 < 3s
└── 根目录外溢文件 = 0

❌ V6.0模式禁止:
├── 跳过任何检查点
├── 维度得分 < 99分
├── 问题未清零就结束
├── 上下文>80%时不暂停
└── 未执行回归测试就标记完成
```

---

## 【11×5验收矩阵】

每个维度 × 每个阶段 = 56个检查点

```
维度/阶段    阶段1:静态分析    阶段2:动态验证    阶段3:数据流验证    阶段4:端到端测试    阶段5:运行时验证
────────────────────────────────────────────────────────────────────────────────────────────────
1.功能验收      代码规范检查      功能可用性测试    数据结构对齐      业务闭环验证       所有页面参数验证
2.性能验收      配置检查         响应时间测试      性能指标监控      压力/负载测试      实际用户操作响应
3.安全验收      代码安全扫描      漏洞动态检测      权限验证         渗透测试          运行时安全验证
4.可移植性      Dockerfile检查    容器运行测试      配置外部化验证    跨环境部署测试      多环境运行时验证
5.可维护性      代码复杂度分析    重构建议验证      依赖关系检查      文档完整性验证      运行时错误监控
6.兼容性        浏览器配置检查    多端适配测试      API版本兼容性    降级策略验证        API运行时兼容
7.可用性        UI组件检查       交互流程测试      状态管理验证      用户操作流程        用户操作流程验证
8.可靠性        异常代码检测      容错机制测试      恢复机制验证      故障演练测试        容错和恢复验证
9.用户文档集    文件存在性检查    内容准确性验证    示例可运行性      文档时效性检查      运行时文档验证
10.产品说明     需求追溯检查      功能覆盖度验证    验收标准对齐      用户确认签字        功能符合需求
11.工作流完整   代码逻辑检查      流程可执行性      数据流转验证      角色权限验证        端到端流程验证
```

---

## 【🚀 全自动验收执行流程 V6.0 - 分批SubAgent模式】

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 0: 初始化 + 路径验证 (自动执行)                                          │
│ ├── 立即执行 /yolo (第一个操作)                                              │
│ ├── 设置 UTF-8 编码 (chcp 65001)                                           │
│ ├── 【路径验证】验证 ai-test-platform 目录存在                                │
│ ├── 【路径验证】创建验收报告目录结构                                          │
│ ├── 初始化检查点追踪器 (56个检查点清单)                                       │
│ ├── 生成 batchId: acceptance-YYYYMMDD-XXX                                  │
│ └── 创建目录: ai-test-platform/docs/07-验收报告/{batchId}/                   │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 【发现阶段】Step 1-5: 分批SubAgent并行检查 (只发现，不修复)                      │
│                                                                             │
│ 使用 use_subagents 启动5个并行 SubAgent，每个负责一个阶段：                     │
│                                                                             │
│ SubAgent 1: Step 1 - 静态分析检查                                            │
│ ├── 检查: 11维度 × 代码规范/配置/Dockerfile/复杂度等                          │
│ ├── 工具: ESLint, TypeScript, Dockerfile扫描                                 │
│ └── 输出: step-1-issues.json (该阶段发现的所有问题)                           │
│                                                                             │
│ SubAgent 2: Step 2 - 动态验证检查                                            │
│ ├── 检查: 11维度 × 页面/API可访问性/响应时间/交互等                           │
│ ├── 工具: 页面访问测试, API测试, 性能测试                                    │
│ └── 输出: step-2-issues.json                                                │
│                                                                             │
│ SubAgent 3: Step 3 - 数据流验证检查                                          │
│ ├── 检查: 11维度 × 数据结构/权限/依赖/状态管理等                              │
│ ├── 工具: 数据库检查, API响应检查, 状态一致性验证                             │
│ └── 输出: step-3-issues.json                                                │
│                                                                             │
│ SubAgent 4: Step 4 - 端到端测试检查                                          │
│ ├── 检查: 11维度 × 业务闭环/压力测试/渗透测试/故障演练等                       │
│ ├── 工具: E2E测试, 压力测试, 安全扫描                                        │
│ └── 输出: step-4-issues.json                                                │
│                                                                             │
│ SubAgent 5: Step 5 - 运行时验证检查 (全68页面)                                │
│ ├── 检查: 11维度 × 所有页面参数验证/运行时安全/运行时错误监控等                 │
│ ├── 工具: 页面遍历测试, 运行时监控, 错误边界检查                              │
│ └── 输出: step-5-issues.json                                                │
│                                                                             │
│ 主Agent汇总:                                                                │
│ ├── 读取 5个 step-X-issues.json                                             │
│ ├── 合并去重，按优先级排序                                                   │
│ └── 生成: issues-report.md (统一问题报告)                                     │
│                                                                             │
│ ⚠️ 上下文检查: 每完成一个大阶段，检查使用率                                   │
│ └── 如果 > 80%: 暂停执行，提示用户执行 /compact                               │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── ✅ issues-report.md 为空 (56/56通过) → 跳到 Step 8
    │
    └── ❌ 发现问题 → 进入 Step 6
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 【修复阶段】Step 6: 分批SubAgent并行修复                                       │
│                                                                             │
│ 读取 issues-report.md，按问题类型分组：                                        │
│                                                                             │
│ 分组策略 (最多5个并行SubAgent):                                               │
│ ├── Group 1: 代码规范问题 (ESLint/TypeScript错误)                             │
│ ├── Group 2: 功能逻辑问题 (API/组件/状态管理)                                 │
│ ├── Group 3: 性能问题 (响应时间/优化配置)                                     │
│ ├── Group 4: 安全问题 (XSS/CSRF/权限/敏感信息)                                │
│ └── Group 5: 其他问题 (文档/配置/兼容性)                                      │
│                                                                             │
│ 每个SubAgent执行TDD修复循环：                                                  │
│ ├── 🔴 分析问题根因                                                          │
│ ├── 🔴 编写测试用例 (先写测试，确保能复现问题)                                 │
│ ├── 🟢 执行测试 (确认测试失败)                                                │
│ ├── 🔧 实现修复                                                              │
│ ├── 🟢 重新执行测试 (确认测试通过)                                            │
│ └── ✅ 标记问题为已修复                                                       │
│                                                                             │
│ 主Agent汇总:                                                                │
│ ├── 收集各SubAgent修复结果                                                    │
│ ├── 更新 issues-report.md (标记修复状态)                                      │
│ └── 统计: 已修复 / 修复失败 / 新增问题                                        │
│                                                                             │
│ ⚠️ 上下文检查: 如果 > 80%，暂停等待 /compact                                  │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 【回归阶段】Step 7: 集中回归测试 (重新执行1-5)                                  │
│                                                                             │
│ 重新执行完整的56检查点验收流程：                                               │
│ ├── 可以使用SubAgent并行或主Agent串行执行                                     │
│ ├── 对比当前 issues-report.md                                                 │
│ │   ├── 检查原问题是否已修复                                                  │
│ │   └── 检查是否引入新问题                                                    │
│ └── 生成回归测试结果                                                          │
│                                                                             │
│ 决策:                                                                        │
│ ├── ❌ 发现新问题 或 原问题未修复                                              │
│ │   ├── 更新 issues-report.md (添加新问题/标记未修复)                          │
│ │   └── 【返回 Step 6】继续修复循环                                            │
│ │                                                                             │
│ └── ✅ 无新问题，所有问题已修复，56/56通过                                     │
│     └── 进入 Step 8                                                          │
│                                                                             │
│ ⚠️ 循环停止条件 (必须全部满足):                                               │
│ ├── 56/56 检查点全部通过                                                      │
│ ├── issues-report.md 中无待修复问题                                           │
│ └── 维度得分 ≥ 99分                                                          │
│                                                                             │
│ ⚠️ 上下文检查: 如果 > 80%，暂停等待 /compact                                  │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 8: 生成最终验收报告 + 自动打开                                            │
│                                                                             │
│ 验证通过标准:                                                                │
│ ├── ✅ 56/56 检查点全部通过                                                   │
│ ├── ✅ 维度得分 ≥ 99分                                                       │
│ ├── ✅ 问题清零 (issues-report.md 无待修复项)                                  │
│ └── ✅ 无跳过检查点                                                          │
│                                                                             │
│ 生成报告:                                                                    │
│ ├── report.md (简洁数据表格)                                                  │
│ │   ├── 验收概览统计                                                          │
│ │   ├── 各维度得分表                                                          │
│ │   ├── 修复历史记录                                                          │
│ │   └── 验收结论                                                              │
│ │                                                                             │
│ └── report.html (精美可视化界面)                                              │
│     ├── 现代化UI设计 (Tailwind风格)                                           │
│     ├── 数据可视化图表 (检查点通过率/维度得分雷达图)                            │
│     ├── 交互式问题列表                                                        │
│     ├── 修复历史时间线                                                        │
│     └── 验收结论卡片                                                          │
│                                                                             │
│ 自动打开:                                                                    │
│ ├── 执行: start report.html (Windows)                                         │
│ ├── 或: open report.html (Mac)                                               │
│ └── 确保浏览器自动打开报告页面                                                 │
│                                                                             │
│ 最后执行 /cleanup (Skill 11)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 【issues-report.md 格式规范】

```markdown
# 验收问题报告

## 报告信息
| 字段 | 值 |
|------|-----|
| 批次ID | acceptance-20260317-001 |
| 生成时间 | 2026-03-17 14:30:00 |
| 当前轮次 | 第1轮 |
| 检查点 | 56/56 |

## 问题统计
| 优先级 | 总数 | 已修复 | 待修复 | 修复率 |
|--------|------|--------|--------|--------|
| P0-阻塞 | 3 | 0 | 3 | 0% |
| P1-高 | 5 | 0 | 5 | 0% |
| P2-中 | 2 | 0 | 2 | 0% |
| P3-低 | 1 | 0 | 1 | 0% |
| **总计** | **11** | **0** | **11** | **0%** |

## 问题列表 (按优先级排序)

### P0-阻塞 (必须修复)

#### Issue-001 [Step-1][维度-功能验收][P0]
- **问题描述**: API路由缺少错误处理
- **文件位置**: `src/app/api/test-cases/route.ts:45`
- **具体问题**: 未处理异步错误，缺少 try-catch 块
- **影响范围**: 可能导致服务器崩溃，影响所有测试用例操作
- **复现步骤**: 1. 访问 /api/test-cases 2. 触发数据库错误
- **修复方案**: 添加 try-catch 错误边界
- **修复状态**: ❌ 待修复
- **修复记录**: 
  - 第1轮: 未开始

#### Issue-002 [Step-3][维度-性能验收][P0]
- **问题描述**: API响应超时
- **文件位置**: `/api/projects/[id]/analysis`
- **具体问题**: 响应时间 8.5s，超过阈值 3s
- **影响范围**: 用户体验差，可能导致请求失败
- **复现步骤**: 1. 打开项目分析页面 2. 查看网络请求时间
- **修复方案**: 添加缓存机制或优化数据库查询
- **修复状态**: ❌ 待修复
- **修复记录**:
  - 第1轮: 未开始

### P1-高 (强烈建议修复)

#### Issue-003 [Step-2][维度-安全验收][P1]
- **问题描述**: XSS漏洞
- **文件位置**: `src/components/TestCaseEditor.tsx:78`
- **具体问题**: 用户输入直接渲染，未进行HTML转义
- **影响范围**: 可能导致XSS攻击
- **修复方案**: 使用 dangerouslySetInnerHTML 前进行DOMPurify处理
- **修复状态**: ❌ 待修复

### P2-中 (建议修复)

#### Issue-008 [Step-5][维度-可用性][P2]
- **问题描述**: 按钮无加载状态
- **文件位置**: `src/components/SubmitButton.tsx`
- **具体问题**: 提交时无loading指示
- **修复方案**: 添加 isLoading 状态显示
- **修复状态**: ❌ 待修复

### P3-低 (可选修复)

#### Issue-011 [Step-1][维度-可维护性][P3]
- **问题描述**:  console.log 未清理
- **文件位置**: `src/lib/utils.ts:23`
- **修复方案**: 移除或改用 logger
- **修复状态**: ❌ 待修复

## 修复历史

### 第1轮修复 (2026-03-17 15:30:00)
| Issue ID | 问题 | 结果 | 备注 |
|----------|------|------|------|
| Issue-001 | API错误处理 | ✅ 已修复 | 添加 try-catch |
| Issue-003 | XSS漏洞 | ✅ 已修复 | 添加 DOMPurify |
| Issue-005 | 类型错误 | ❌ 修复失败 | 需重构接口 |
| Issue-010 | 新增问题 | ⚠️ 新发现 | Step-7回归发现 |

### 第2轮修复 (2026-03-17 16:00:00)
| Issue ID | 问题 | 结果 | 备注 |
|----------|------|------|------|
| Issue-005 | 类型错误 | ✅ 已修复 | 重构完成 |
| Issue-010 | 新增问题 | ✅ 已修复 | - |

## 验收结论 (动态更新)
- 当前状态: 🔄 修复中
- 还需修复: 11个问题
- 预计完成: 第3轮修复后
```

---

## 【report.md 格式规范】

```markdown
# AI Test Platform - 验收报告

## 验收概览
| 指标 | 数值 | 状态 |
|------|------|------|
| 批次ID | acceptance-20260317-001 | - |
| 检查点覆盖 | 56/56 (100%) | ✅ |
| 维度平均得分 | 99.2/100 | ✅ |
| 修复轮次 | 3轮 | - |
| 发现问题 | 15个 | - |
| 修复问题 | 15个 | ✅ |
| 遗留问题 | 0个 | ✅ |
| 总耗时 | 2小时35分钟 | - |

## 各维度得分详情
| 维度 | 阶段1 | 阶段2 | 阶段3 | 阶段4 | 阶段5 | 平均分 | 状态 |
|------|-------|-------|-------|-------|-------|--------|------|
| 1.功能验收 | 98 | 100 | 99 | 100 | 98 | 99.0 | ✅ |
| 2.性能验收 | 100 | 98 | 99 | 100 | 99 | 99.2 | ✅ |
| 3.安全验收 | 100 | 100 | 100 | 100 | 100 | 100 | ✅ |
| 4.可移植性 | 99 | 99 | 98 | 99 | 99 | 98.8 | ✅ |
| 5.可维护性 | 98 | 99 | 99 | 98 | 99 | 98.6 | ✅ |
| 6.兼容性 | 100 | 100 | 99 | 100 | 99 | 99.6 | ✅ |
| 7.可用性 | 99 | 98 | 99 | 99 | 100 | 99.0 | ✅ |
| 8.可靠性 | 100 | 100 | 100 | 99 | 100 | 99.8 | ✅ |
| 9.用户文档集 | 99 | 99 | 98 | 99 | 99 | 98.8 | ✅ |
| 10.产品说明 | 100 | 100 | 100 | 100 | 100 | 100 | ✅ |
| 11.工作流完整 | 99 | 99 | 100 | 99 | 99 | 99.2 | ✅ |

## 关键指标
| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| API平均响应时间 | < 3s | 1.2s | ✅ |
| 页面加载时间 | < 3s | 0.8s | ✅ |
| 测试覆盖率 | > 80% | 87% | ✅ |
| 控制台错误数 | 0 | 0 | ✅ |
| 根目录外溢文件 | 0 | 0 | ✅ |

## 修复历史摘要
- **第1轮**: 修复 8个问题，新增 2个问题，遗留 9个
- **第2轮**: 修复 6个问题，新增 1个问题，遗留 4个
- **第3轮**: 修复 4个问题，新增 0个问题，遗留 0个

## 验收结论

### ✅ 验收通过

**所有验收标准均已满足：**
- ✅ 56/56 检查点全部通过 (100%)
- ✅ 所有维度得分 ≥ 99分
- ✅ 所有问题已修复清零
- ✅ 运行时错误为 0
- ✅ API响应 < 3s
- ✅ 页面加载 < 3s

**建议:**
- 继续保持代码质量
- 定期进行回归测试
- 关注性能监控指标

---
*报告生成时间: 2026-03-17 17:05:00*
*验收批次: acceptance-20260317-001*
```

---

## 【report.html 格式规范 - 精美可视化】

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Test Platform - 验收报告</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    /* 自定义动画 */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.6s ease-out forwards;
    }
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .status-badge-pass {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    .status-badge-fail {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 顶部 Hero -->
  <div class="gradient-bg text-white py-12">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold mb-2">🎯 验收报告</h1>
          <p class="text-purple-100">AI Test Platform - V6.0分批验收</p>
          <p class="text-sm text-purple-200 mt-1">批次: acceptance-20260317-001</p>
        </div>
        <div class="text-right">
          <div class="glass-card rounded-2xl px-8 py-4 text-gray-800">
            <div class="text-5xl font-bold text-green-600">99.2</div>
            <div class="text-sm text-gray-500">维度平均分</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-6 -mt-8">
    <!-- 核心指标卡片 -->
    <div class="grid grid-cols-4 gap-6 mb-8">
      <div class="glass-card rounded-xl p-6 shadow-lg animate-fade-in" style="animation-delay: 0.1s">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">检查点覆盖</p>
            <p class="text-3xl font-bold text-gray-800">56/56</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <span class="text-2xl">✅</span>
          </div>
        </div>
        <div class="mt-3">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">100% 通过</p>
        </div>
      </div>

      <div class="glass-card rounded-xl p-6 shadow-lg animate-fade-in" style="animation-delay: 0.2s">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">修复轮次</p>
            <p class="text-3xl font-bold text-gray-800">3轮</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <span class="text-2xl">🔄</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3">15个问题已清零</p>
      </div>

      <div class="glass-card rounded-xl p-6 shadow-lg animate-fade-in" style="animation-delay: 0.3s">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">API响应</p>
            <p class="text-3xl font-bold text-gray-800">1.2s</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <span class="text-2xl">⚡</span>
          </div>
        </div>
        <p class="text-xs text-green-600 mt-3">✓ 低于 3s 目标</p>
      </div>

      <div class="glass-card rounded-xl p-6 shadow-lg animate-fade-in" style="animation-delay: 0.4s">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">遗留问题</p>
            <p class="text-3xl font-bold text-gray-800">0</p>
          </div>
          <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <span class="text-2xl">🎉</span>
          </div>
        </div>
        <p class="text-xs text-green-600 mt-3">✓ 全部修复</p>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="grid grid-cols-2 gap-6 mb-8">
      <!-- 维度得分雷达图 -->
      <div class="glass-card rounded-xl p-6 shadow-lg">
        <h3 class="text-lg font-bold text-gray-800 mb-4">📊 各维度得分分布</h3>
        <canvas id="dimensionChart" width="400" height="300"></canvas>
      </div>

      <!-- 检查点通过情况 -->
      <div class="glass-card rounded-xl p-6 shadow-lg">
        <h3 class="text-lg font-bold text-gray-800 mb-4">✅ 检查点通过情况</h3>
        <canvas id="checkpointChart" width="400" height="300"></canvas>
      </div>
    </div>

    <!-- 详细数据表格 -->
    <div class="glass-card rounded-xl p-6 shadow-lg mb-8">
      <h3 class="text-lg font-bold text-gray-800 mb-4">📋 各维度详细得分</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-gray-600">维度</th>
              <th class="px-4 py-3 text-center">阶段1</th>
              <th class="px-4 py-3 text-center">阶段2</th>
              <th class="px-4 py-3 text-center">阶段3</th>
              <th class="px-4 py-3 text-center">阶段4</th>
              <th class="px-4 py-3 text-center">阶段5</th>
              <th class="px-4 py-3 text-center font-bold">平均</th>
              <th class="px-4 py-3 text-center">状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">功能验收</td>
              <td class="px-4 py-3 text-center">98</td>
              <td class="px-4 py-3 text-center">100</td>
              <td class="px-4 py-3 text-center">99</td>
              <td class="px-4 py-3 text-center">100</td>
              <td class="px-4 py-3 text-center">98</td>
              <td class="px-4 py-3 text-center font-bold text-green-600">99.0</td>
              <td class="px-4 py-3 text-center"><span class="status-badge-pass text-white px-2 py-1 rounded-full text-xs">通过</span></td>
            </tr>
            <!-- 其他维度行... -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 修复历史时间线 -->
    <div class="glass-card rounded-xl p-6 shadow-lg mb-8">
      <h3 class="text-lg font-bold text-gray-800 mb-4">🔄 修复历史</h3>
      <div class="space-y-4">
        <div class="flex items-start space-x-4">
          <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">3</div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">第3轮修复</h4>
              <span class="text-sm text-gray-500">16:00 - 17:05</span>
            </div>
            <p class="text-gray-600 text-sm mt-1">修复 4个问题，新增 0个，遗留 0个</p>
            <div class="flex space-x-2 mt-2">
              <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Issue-012 已修复</span>
              <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Issue-013 已修复</span>
            </div>
          </div>
        </div>
        <!-- 第2轮、第1轮... -->
      </div>
    </div>

    <!-- 验收结论 -->
    <div class="glass-card rounded-xl p-8 shadow-lg mb-8 status-badge-pass text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-2">🎉 验收通过</h2>
          <p class="text-green-100">所有56个检查点已通过，维度得分≥99分，问题已全部清零</p>
        </div>
        <div class="text-6xl">✅</div>
      </div>
    </div>
  </div>

  <script>
    // 维度得分雷达图
    const dimensionCtx = document.getElementById('dimensionChart').getContext('2d');
    new Chart(dimensionCtx, {
      type: 'radar',
      data: {
        labels: ['功能', '性能', '安全', '可移植', '可维护', '兼容', '可用', '可靠', '文档', '产品', '工作流'],
        datasets: [{
          label: '维度得分',
          data: [99, 99.2, 100, 98.8, 98.6, 99.6, 99, 99.8, 98.8, 100, 99.2],
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          borderColor: 'rgba(102, 126, 234, 1)',
          pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        }]
      },
      options: {
        scales: {
          r: {
            min: 90,
            max: 100,
          }
        }
      }
    });

    // 检查点通过情况饼图
    const checkpointCtx = document.getElementById('checkpointChart').getContext('2d');
    new Chart(checkpointCtx, {
      type: 'doughnut',
      data: {
        labels: ['通过', '未通过'],
        datasets: [{
          data: [56, 0],
          backgroundColor: ['#10b981', '#ef4444'],
        }]
      }
    });
  </script>
</body>
</html>
```

---

## 【SubAgent 指令模板】

### SubAgent 1-5 检查指令

```yaml
subagent_prompt: |
  你是验收专家，负责执行第 {step_number} 阶段的检查。
  
  ## 任务
  对 AI Test Platform 项目执行第 {step_number} 阶段: {step_name} 的验收检查。
  
  ## 检查范围 (11维度)
  {dimensions_list}
  
  ## 检查要求
  1. 仔细检查该阶段的所有检查点
  2. 记录所有发现的问题，包括：
     - 问题描述
     - 文件位置
     - 优先级 (P0/P1/P2/P3)
     - 修复建议
  3. 不要修复问题，只记录
  
  ## 输出格式
  输出到文件: ai-test-platform/docs/07-验收报告/{batchId}/step-{step_number}-issues.json
  
  ```json
  {
    "step": {step_number},
    "stepName": "{step_name}",
    "checkpoints": {total_checkpoints},
    "passed": {passed_count},
    "failed": {failed_count},
    "issues": [
      {
        "id": "Issue-{step_number}-001",
        "step": {step_number},
        "dimension": "功能验收",
        "priority": "P0",
        "description": "...",
        "location": "...",
        "details": "...",
        "fixSuggestion": "..."
      }
    ],
    "summary": "该阶段检查发现 X 个问题"
  }
  ```
```

### SubAgent 6 修复指令

```yaml
subagent_prompt: |
  你是修复专家，负责修复验收发现的问题。
  
  ## 任务
  修复以下问题组中的问题：
  
  问题组: {group_name}
  问题列表:
  {issues_list}
  
  ## 修复流程 (TDD)
  对每个问题：
  1. 分析问题根因
  2. 编写测试用例 (先写测试，确保能复现问题)
  3. 执行测试 (确认测试失败)
  4. 实现修复
  5. 重新执行测试 (确认测试通过)
  6. 标记为已修复
  
  ## 输出格式
  更新文件: ai-test-platform/docs/07-验收报告/{batchId}/issues-report.md
  在该文件的"修复历史"部分添加修复记录
```

---

## 【🎮 快捷指令 V6.0】

- `/acceptance` - 启动 V6.0 分批SubAgent验收
- `/acceptance --report` - 查看当前验收报告
- `/yolo` - 进入自动执行模式
- `/compact` - 执行上下文压缩（上下文>80%时自动提示）
- `/cost` - 显示当前消耗

---

## 【⚠️ 上下文管理策略】

V6.0 增加了智能上下文管理：

```yaml
上下文检查点:
  - 位置: Step 0完成后
  - 位置: Step 1-5每个SubAgent完成后
  - 位置: Step 6每组修复完成后
  - 位置: Step 7回归测试前

检查逻辑:
  - 如果 context_usage > 80%:
      action: 暂停执行
      message: |
        ⚠️ 上下文使用率超过80% ({usage}%)
        
        请执行以下操作：
        1. 输入 /compact 压缩上下文
        2. 压缩完成后，输入 /acceptance --continue 继续验收
        
        当前状态已保存到 memory.md
  
  - 如果 context_usage > 95%:
      action: 强制保存并停止
      message: |
        🛑 上下文使用率超过95%，即将溢出
        
        已自动保存状态。
        请：
        1. 立即执行 /compact
        2. 然后重新启动验收流程
```

---

## 【⚠️ Skill修改强制检查清单 V6.0】

**修改本Skill时，必须完成以下同步更新：**

```markdown
- [ ] 1. 更新 `.clinerules` (触发关键词/快捷指令)
- [ ] 2. 更新 `.clinerules/skills/quality/project-acceptance/SKILL.md` (本文件)
- [ ] 3. 更新 `.clinerules/USAGE.md` (快捷指令表)
- [ ] 4. 更新版本号 (5.2 → 6.0)
- [ ] 5. 更新最后更新时间
```

**违规后果**: Skill定义不一致，导致行为差异

================================================================================
*Skill版本: 6.0 | 最后更新: 2026-03-17 | 核心增强: 分批SubAgent检查 + 循环修复 + 精美HTML报告*
