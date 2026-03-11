# encoding: utf-8
# -*- coding: utf-8 -*-

## Skill 14: 第三方验收专家 (Project Acceptance Expert) V3.5 - 自动化修复版

【触发方式】: 
- 用户输入: "验收项目"、"版本验收"、"项目验收"、"/acceptance"
- 自动触发: 大版本发布前、重大功能上线前
- CI/CD集成: 部署流水线最后阶段
- **新增**: 验收失败自动触发修复循环

【核心定位】: 
第三方独立验收专家，采用 **11维度 × 四阶段矩阵** 对项目进行深度验收，每个维度都经过完整的四阶段验证。当验收发现问题时，**自动启动SubAgents TDD修复循环**，直到满足验收标准。

---

## 【11×4验收矩阵】

每个维度 × 每个阶段 = 44个检查点

```
维度/阶段    阶段1:静态分析    阶段2:动态验证    阶段3:数据流验证    阶段4:端到端测试
────────────────────────────────────────────────────────────────────────────────
1.功能验收      代码规范检查      功能可用性测试    数据结构对齐      业务闭环验证
               (代码质量)       (页面/API可访问)   (前后端一致)      (完整用户流程)

2.性能验收      配置检查         响应时间测试      性能指标监控      压力/负载测试
               (优化配置)       (实际响应)        (数据指标)        (极限场景)

3.安全验收      代码安全扫描      漏洞动态检测      权限验证         渗透测试
               (静态分析)       (运行时检测)      (数据权限)        (模拟攻击)

4.可移植性      Dockerfile检查    容器运行测试      配置外部化验证    跨环境部署测试
               (镜像规范)       (容器启动)        (环境变量)        (多环境验证)

5.可维护性      代码复杂度分析    重构建议验证      依赖关系检查      文档完整性验证
               (圈复杂度)       (代码异味)        (耦合度)          (维护文档)

6.兼容性        浏览器配置检查    多端适配测试      API版本兼容性    降级策略验证
               (browserslist)   (响应式/移动端)   (接口兼容)        ( graceful降级)

7.可用性        UI组件检查       交互流程测试      状态管理验证      用户操作流程
               (组件规范)       (点击/输入)       (状态一致性)      (端到端体验)

8.可靠性        异常代码检测      容错机制测试      恢复机制验证      故障演练测试
               (错误处理)       (异常捕获)        (数据恢复)        (故障注入)

9.用户文档集    文件存在性检查    内容准确性验证    示例可运行性      文档时效性检查
               (文件齐全)       (内容正确)        (代码可执行)      (更新及时)

10.产品说明     需求追溯检查      功能覆盖度验证    验收标准对齐      用户确认签字
               (需求映射)       (功能完整)        (标准符合)        (用户验收)

11.工作流完整   代码逻辑检查      流程可执行性      数据流转验证      角色权限验证
               (逻辑正确)       (步骤可执行)      (数据完整性)      (权限矩阵)
```

---

## 【11维度验收清单】

| 维度 | 名称 | 权重 | 核心关注点 |
|------|------|------|------------|
| 1 | 功能验收 | 15% | BugHunter + 功能深度审查 |
| 2 | 性能效率验收 | 10% | API响应<3s, 页面加载<3s, DB查询<100ms |
| 3 | 安全性验收 | 15% | OWASP Top 10, SQL注入, XSS, CSRF |
| 4 | 可移植性验收 | 5% | Docker容器化, 环境配置外部化 |
| 5 | 可维护性验收 | 10% | 代码重复, 复杂度, 命名规范 |
| 6 | 兼容性验收 | 10% | 浏览器兼容, 移动端适配 |
| 7 | 可用性验收 | 10% | 用户体验, 无障碍访问 |
| 8 | 可靠性验收 | 10% | 容错性, 故障恢复 |
| 9 | 用户文档集验收 | 5% | 文档完整性, API准确性 |
| 10 | 产品说明验收 | 5% | 需求符合性, 功能完整性 |
| 11 | 工作流完整性验收 | 5% | 业务流程, 角色权限, 数据流转 |

---

## 【四阶段验收流程】

### 阶段 1: 静态分析 (权重30%)
对所有维度进行代码层面的静态检查：

| 维度 | 检查项 | 工具/方法 |
|------|--------|-----------|
| 功能 | TypeScript类型检查、语法错误 | tsc --noEmit |
| 性能 | 配置优化检查 (next.config.ts) | 配置审查 |
| 安全 | ESLint安全规则扫描 | eslint-security |
| 可移植 | Dockerfile规范检查 | hadolint |
| 可维护 | 代码复杂度、重复率 | sonarqube |
| 兼容 | browserslist配置检查 | 配置审查 |
| 可用 | UI组件规范检查 | storybook |
| 可靠 | 错误处理代码扫描 | 代码审查 |
| 文档 | 文件存在性、README完整性 | 文件扫描 |
| 产品 | 需求文档与代码映射 | 追溯矩阵 |
| 工作流 | 代码逻辑、分支覆盖 | 代码审查 |

### 阶段 2: 动态验证 (权重25%)
运行时的功能性验证：

| 维度 | 检查项 | 工具/方法 |
|------|--------|-----------|
| 功能 | 页面可访问性、API响应格式 | Playwright/Curl |
| 性能 | 实际响应时间测量 | Lighthouse |
| 安全 | 漏洞动态检测、XSS尝试 | OWASP ZAP |
| 可移植 | 容器启动测试、健康检查 | Docker run |
| 可维护 | 热重载、开发体验 | HMR测试 |
| 兼容 | 多浏览器测试、移动端 | BrowserStack |
| 可用 | 交互流程测试、点击/输入 | Playwright |
| 可靠 | 异常注入、容错测试 | Chaos Monkey |
| 文档 | 示例代码可运行性 | 代码执行 |
| 产品 | 功能可用性验证 | 功能测试 |
| 工作流 | 业务流程可执行性 | 流程测试 |

### 阶段 3: 数据流验证 (权重25%)
数据完整性和一致性验证：

| 维度 | 检查项 | 工具/方法 |
|------|--------|-----------|
| 功能 | 前后端数据结构对齐 | 类型对比 |
| 性能 | 性能指标数据收集 | Prometheus |
| 安全 | 权限数据验证、角色检查 | 权限矩阵 |
| 可移植 | 配置外部化验证 | 环境变量检查 |
| 可维护 | 依赖关系图生成 | dependency-cruiser |
| 兼容 | API版本数据兼容性 | 版本对比 |
| 可用 | 状态管理数据流 | Redux DevTools |
| 可靠 | 数据恢复验证、备份检查 | 数据恢复测试 |
| 文档 | 文档与代码一致性 | 文档同步检查 |
| 产品 | 验收标准数据对齐 | 标准检查 |
| 工作流 | 数据流转完整性 | 数据流图 |

### 阶段 4: 端到端测试 (权重20%)
完整业务流程和极限场景验证：

| 维度 | 检查项 | 工具/方法 |
|------|--------|-----------|
| 功能 | 业务闭环测试、完整用户流程 | E2E测试 |
| 性能 | 压力测试、负载测试 | k6/Artillery |
| 安全 | 渗透测试、安全扫描 | Burp Suite |
| 可移植 | 跨环境部署测试 | 多环境CI/CD |
| 可维护 | 文档更新及时性、代码注释 | 文档审查 |
| 兼容 | 降级策略验证 | 功能降级测试 |
| 可用 | 用户满意度、易用性测试 | 用户测试 |
| 可靠 | 故障演练、灾难恢复 | 故障注入 |
| 文档 | 用户反馈收集 | 反馈分析 |
| 产品 | 用户确认签字、验收报告 | 用户验收 |
| 工作流 | 角色权限矩阵验证 | RBAC测试 |

---

## 【通过标准 V3.5 - 严格模式】

```
✅ 强制满足 (缺一不可):
├── 高优先级漏洞 = 0
├── 中优先级漏洞 = 0
├── 低优先级漏洞 < 5
├── 11维度 × 4阶段 检查点覆盖率 ≥ 95%
├── 关键维度 (功能/性能/安全) 得分 ≥ 90分
├── 测试覆盖率 ≥ 99%
├── API平均响应 < 3s
├── 页面加载时间 < 3s
├── 控制台错误 = 0
└── 根目录外溢文件 = 0

⚠️ 建议满足:
├── 代码重复率 < 5%
├── 数据库查询 < 100ms
└── 所有维度得分 ≥ 80分
```

---

## 【⭐ V3.5 新增：自动化修复循环】

### 自动修复流程

```
验收测试执行
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    验收结果判断                              │
└─────────────────────────────────────────────────────────────┘
    │
    ├─ ✅ 全部通过 → 生成最终报告 → 结束
    │
    └─ ❌ 发现问题 → 启动自动修复循环
         │
         ▼
    ┌────────────────────────────────────────────────────────┐
│ Step 1: 问题分析与分组                                    │
│ ├── 按维度分组失败项 (功能/性能/安全等)                   │
│ ├── 按优先级排序 (高/中/低)                              │
│ └── 生成分维度修复任务清单                                │
└────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────┐
│ Step 2: 启动 SubAgents TDD 模式                          │
│ ├── 为每个失败维度启动独立 SubAgent                      │
│ │   └── SubAgent-1: 修复功能维度问题                     │
│ │   └── SubAgent-2: 修复性能维度问题                     │
│ │   └── SubAgent-3: 修复安全维度问题                     │
│ │   └── ... (并行执行)                                   │
│ └── 每个 SubAgent 执行: 红→绿→重构 TDD 循环             │
└────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────┐
│ Step 3: 执行回归测试                                      │
│ ├── 重新执行失败的检查点                                 │
│ ├── 验证修复效果                                         │
│ └── 生成回归测试报告                                     │
└────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────┐
│ Step 4: 循环判断                                          │
│ ├── 回归测试通过?                                        │
│ │   ├── 是 → 退出修复循环                                │
│ │   └── 否 → 检查迭代次数                                │
│ │       ├── < 最大迭代次数(3次) → 返回 Step 2            │
│ │       └── ≥ 最大迭代次数 → 标记为需人工处理            │
│ └── 记录修复历史                                         │
└────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────┐
│ Step 5: 生成修复总结                                      │
│ ├── 修复迭代次数                                         │
│ ├── 各维度修复状态                                       │
│ ├── 遗留问题清单 (如有)                                  │
│ └── 修复耗时统计                                         │
└────────────────────────────────────────────────────────┘
```

### SubAgent TDD 修复任务模板

```typescript
// SubAgent 修复任务定义
interface FixTask {
  dimension: number;           // 维度编号 (1-11)
  dimensionName: string;       // 维度名称
  phase: number;               // 阶段编号 (1-4)
  phaseName: string;           // 阶段名称
  priority: 'high' | 'medium' | 'low';
  issue: {
    description: string;       // 问题描述
    location?: string;         // 代码位置
    expected: string;          // 期望结果
    actual: string;            // 实际结果
  };
  tddMode: true;              // 强制TDD模式
}

// SubAgent 执行流程
async function subAgentFix(task: FixTask) {
  // 1. 红: 编写失败的测试
  await writeFailingTest(task);
  
  // 2. 绿: 编写最小代码使测试通过
  await writeMinimalFix(task);
  
  // 3. 重构: 优化代码质量
  await refactorCode(task);
  
  // 4. 验证: 确认修复成功
  return await verifyFix(task);
}
```

### 修复循环配置

```yaml
# 自动修复配置
autoFix:
  enabled: true                    # 启用自动修复
  maxIterations: 3                 # 最大修复迭代次数
  parallelAgents: 5                # 并行SubAgent数量
  
  # 维度修复优先级
  priority:
    high: [1, 3, 2]               # 功能、安全、性能优先
    medium: [5, 8, 7, 11]         # 可维护性、可靠性、可用性、工作流
    low: [6, 4, 9, 10]            # 兼容性、可移植性、文档、产品说明
  
  # 阶段修复策略
  phaseStrategy:
    1: autoFix                     # 静态分析 - 自动修复
    2: autoFix                     # 动态验证 - 自动修复
    3: autoFix                     # 数据流验证 - 自动修复
    4: manualReview                # 端到端测试 - 需人工确认
```

---

## 【⭐ V3.5 新增：双格式验收报告】

### 报告结构 - 单份报告 (简化)

```
ai-test-platform/docs/07-验收报告/
├── README.md                          # 验收报告索引
└── acceptance-YYYYMMDD-XXX/           # 验收批次
    ├── report.md                      # 【唯一报告】Markdown
    ├── report.html                    # 【唯一报告】HTML可视化
    ├── acceptance-config.json         # 本次验收配置
    └── attachments/                   # 附件
        ├── screenshots/
        ├── logs/
        └── test-results/
```

**报告更新逻辑**:
- 初始验收 → 生成 report.md + report.html
- 修复循环 → 更新同一份报告 (添加修复记录)
- 回归测试 → 更新验收结果和状态
- 最终输出 → 完整的单一报告

### HTML 报告模板 - 简洁美观版

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验收报告 - {{batchId}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa; 
      color: #333; 
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    
    /* 头部卡片 */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header h1 { font-size: 2em; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 0.95em; }
    .header .status-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 15px;
    }
    .status-pass { background: #4CAF50; }
    .status-fail { background: #f44336; }
    
    /* 得分卡片 */
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .score-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      text-align: center;
    }
    .score-card .value { 
      font-size: 2.5em; 
      font-weight: bold; 
      color: #667eea;
    }
    .score-card .label { color: #666; font-size: 0.9em; margin-top: 5px; }
    
    /* 矩阵表格 */
    .matrix-section { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .matrix-section h2 { margin-bottom: 20px; color: #333; }
    .matrix-table { width: 100%; border-collapse: collapse; }
    .matrix-table th { 
      background: #f8f9fa; 
      padding: 12px; 
      text-align: center; 
      font-weight: 600;
      border-bottom: 2px solid #e9ecef;
    }
    .matrix-table td { 
      padding: 12px; 
      text-align: center; 
      border-bottom: 1px solid #e9ecef;
    }
    .matrix-table tr:hover { background: #f8f9fa; }
    .cell-pass { color: #4CAF50; font-weight: bold; }
    .cell-warn { color: #FF9800; font-weight: bold; }
    .cell-fail { color: #f44336; font-weight: bold; }
    
    /* 修复历史 */
    .fix-section { background: white; padding: 30px; border-radius: 12px; }
    .fix-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .fix-item:last-child { border-bottom: none; }
    .fix-round {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 15px;
    }
    .fix-content { flex: 1; }
    .fix-content .dim { font-weight: 600; color: #333; }
    .fix-content .detail { color: #666; font-size: 0.9em; }
    .fix-status { padding: 5px 12px; border-radius: 12px; font-size: 0.85em; }
    .fix-success { background: #e8f5e9; color: #4CAF50; }
    
    /* 结论 */
    .conclusion {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-top: 30px;
      border-left: 4px solid #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 头部 -->
    <div class="header">
      <h1>🎯 项目验收报告</h1>
      <div class="meta">
        批次: {{batchId}} | 版本: {{version}} | 时间: {{timestamp}}
      </div>
      <div class="status-badge {{finalStatusClass}}">{{finalStatus}}</div>
    </div>
    
    <!-- 得分卡片 -->
    <div class="score-grid">
      <div class="score-card">
        <div class="value">{{totalScore}}</div>
        <div class="label">综合得分</div>
      </div>
      <div class="score-card">
        <div class="value">{{checkpoints}}</div>
        <div class="label">检查点通过</div>
      </div>
      <div class="score-card">
        <div class="value">{{fixIterations}}</div>
        <div class="label">修复迭代</div>
      </div>
      <div class="score-card">
        <div class="value">{{duration}}</div>
        <div class="label">执行时长</div>
      </div>
    </div>
    
    <!-- 11×4矩阵 -->
    <div class="matrix-section">
      <h2>📊 11×4 验收矩阵</h2>
      <table class="matrix-table">
        <thead>
          <tr>
            <th>维度</th>
            <th>静态分析</th>
            <th>动态验证</th>
            <th>数据流验证</th>
            <th>端到端测试</th>
            <th>得分</th>
          </tr>
        </thead>
        <tbody>
          <!-- 动态生成 -->
        </tbody>
      </table>
    </div>
    
    <!-- 修复历史 -->
    <div class="fix-section">
      <h2>🔧 自动修复记录</h2>
      <!-- 动态生成 -->
    </div>
    
    <!-- 结论 -->
    <div class="conclusion">
      <h3>📋 验收结论</h3>
      <p>{{conclusionText}}</p>
    </div>
  </div>
</body>
</html>
```

---

## 【执行流程 V3.5】

### 完整验收流程

```
Step 1: 阶段1静态分析 (遍历11维度)
  ├── 维度1: 功能 - 代码规范检查
  ├── 维度2: 性能 - 配置检查
  ├── ...
  └── 维度11: 工作流 - 代码逻辑检查

Step 2: 阶段2动态验证 (遍历11维度)
  ├── 维度1: 功能 - 页面/API测试
  ├── 维度2: 性能 - 响应时间测试
  ├── ...
  └── 维度11: 工作流 - 流程可执行性

Step 3: 阶段3数据流验证 (遍历11维度)
  ├── 维度1: 功能 - 数据结构对齐
  ├── 维度2: 性能 - 性能指标收集
  ├── ...
  └── 维度11: 工作流 - 数据流转验证

Step 4: 阶段4端到端测试 (遍历11维度)
  ├── 维度1: 功能 - 业务闭环测试
  ├── 维度2: 性能 - 压力测试
  ├── ...
  └── 维度11: 工作流 - 角色权限验证

Step 5: 【新增】验收结果判断
  ├── 全部通过 → 跳到 Step 7
  └── 发现问题 → 进入 Step 6

Step 6: 【新增】自动修复循环
  ├── 6.1 问题分析与分组
  ├── 6.2 启动 SubAgents TDD 修复
  ├── 6.3 执行回归测试
  ├── 6.4 循环判断 (最多3次迭代)
  └── 6.5 生成修复总结

Step 7: 【增强】生成双格式验收报告
  ├── Markdown 报告 (详细文本)
  │   ├── summary.md
  │   ├── matrix-report.md
  │   └── fix-history.md
  └── HTML 报告 (可视化)
      ├── summary.html
      ├── matrix-report.html
      └── fix-history.html

Step 8: 【新增】报告汇总与通知
  ├── 计算最终验收得分
  ├── 判断是否通过验收标准
  ├── 输出验收结论
  └── 提示用户查看报告
```

---

## 【输出示例 - V3.5 增强版】

```
🎯 第三方验收专家 - 项目验收报告 V3.5

📋 验收信息
├── 批次ID: acceptance-20260311-003
├── 验收时间: 2026-03-11 14:30:00
├── 验收版本: v2.5.0
├── 执行时长: 45分32秒
├── 检查点: 44/44 (100%覆盖)
├── 初始状态: ❌ 发现 12 个问题
├── 自动修复: 🔧 3 轮迭代
└── 最终状态: ✅ 验收通过

📊 11×4矩阵验收结果: ✅ 通过

┌─────────────────────────────────────────────────────────────────────────────┐
│ 维度/阶段    │ 静态分析 │ 动态验证 │ 数据流验证 │ 端到端测试 │ 维度得分 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1.功能验收   │   ✅     │   ✅     │    ✅     │    ✅      │  95/100 │
│ 2.性能验收   │   ✅     │   ✅     │    ✅     │    ✅      │  92/100 │
│ 3.安全验收   │   ✅     │   ✅     │    ✅     │    ✅      │  98/100 │
│ 4.可移植性   │   ✅     │   ✅     │    ✅     │    ✅      │ 100/100 │
│ 5.可维护性   │   ✅     │   ✅     │    ✅     │    ✅      │  88/100 │
│ 6.兼容性     │   ✅     │   ✅     │    ✅     │    ✅      │  98/100 │
│ 7.可用性     │   ✅     │   ✅     │    ✅     │    ✅      │  90/100 │
│ 8.可靠性     │   ✅     │   ✅     │    ✅     │    ✅      │  92/100 │
│ 9.文档集     │   ✅     │   ✅     │    ✅     │    ✅      │  95/100 │
│ 10.产品说明  │   ✅     │   ✅     │    ✅     │    ✅      │  92/100 │
│ 11.工作流    │   ✅     │   ✅     │    ✅     │    ✅      │  90/100 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 阶段得分     │  96/100  │  95/100  │   96/100  │   93/100   │ 综合: 95 │
└─────────────────────────────────────────────────────────────────────────────┘

🔧 自动修复历史
┌──────────┬──────────┬──────────┬──────────────────────────────────────┐
│ 迭代轮次  │ 修复维度  │ 修复问题  │ 修复结果                              │
├──────────┼──────────┼──────────┼──────────────────────────────────────┤
│ 迭代 1   │ 功能/性能 │ 5个      │ 功能问题全部修复, 性能问题部分修复   │
│ 迭代 2   │ 性能/安全 │ 4个      │ 性能达标, 安全漏洞修复               │
│ 迭代 3   │ 可用性    │ 3个      │ UI交互问题修复                       │
└──────────┴──────────┴──────────┴──────────────────────────────────────┘

📈 修复统计
├── 总问题数: 12
├── 自动修复: 12 (100%)
├── 遗留问题: 0
├── 修复耗时: 18分45秒
└── 平均每个问题: 1分33秒

📄 验收报告文件
├── Markdown 报告:
│   ├── docs/07-验收报告/acceptance-20260311-003/summary.md
│   ├── docs/07-验收报告/acceptance-20260311-003/matrix-report.md
│   └── docs/07-验收报告/acceptance-20260311-003/fix-history.md
├── HTML 报告:
│   ├── docs/07-验收报告/acceptance-20260311-003/summary.html
│   ├── docs/07-验收报告/acceptance-20260311-003/matrix-report.html
│   └── docs/07-验收报告/acceptance-20260311-003/fix-history.html
└── 查看命令: code docs/07-验收报告/acceptance-20260311-003/summary.html

✅ 验收结论: 项目通过验收，可以发布！
```

---

## 【快捷指令 V3.5】

- `/acceptance` - 启动完整11×4矩阵验收（含自动修复）
- `/acceptance --quick` - 快速验收 (仅阶段1+2，不触发自动修复)
- `/acceptance --dim=1,3,5` - 验收指定维度 (所有阶段)
- `/acceptance --phase=1` - 仅执行阶段1 (所有维度)
- `/acceptance --cell=1-1,3-2` - 验收指定矩阵单元格
- `/acceptance --no-fix` - 验收但不自动修复
- `/acceptance --fix-only` - 仅执行修复循环（基于上次验收结果）
- `/acceptance --report` - 查看最近验收报告
- `/acceptance --history` - 查看验收历史

---

## 【Skill 更新同步强制规则】

**⚠️ 修改本Skill时必须同步更新:**
- [ ] `.clinerules` (触发关键词/快捷指令)
- [ ] `.clinerules/skills/skill-14-project-acceptance.md` (本文件)
- [ ] `.kimi/skills/project-acceptance/skill-14-optimized.md` (Kimi版本)
- [ ] `.clinerules/USAGE.md` (快捷指令表)
- [ ] 最后更新时间

================================================================================
*Skill版本: 3.5 | 最后更新: 2026-03-12 | 核心增强: 自动修复循环 + 双格式报告*
