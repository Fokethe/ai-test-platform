# 项目验收报告

## 📋 验收信息

| 项目 | 内容 |
|------|------|
| **批次ID** | {{batchId}} |
| **验收时间** | {{acceptanceTime}} |
| **验收版本** | {{version}} |
| **执行时长** | {{duration}} |
| **验收专家** | AI第三方验收专家 |

---

## 📊 验收结果

### 综合判定: {{verdict}}

| 指标 | 数值 |
|------|------|
| **综合得分** | {{totalScore}}/100 |
| **通过维度** | {{passedDimensions}}/11 |
| **高优先级漏洞** | {{highIssues}} |
| **中优先级漏洞** | {{mediumIssues}} |
| **低优先级漏洞** | {{lowIssues}} |

---

## 📈 维度详情

{{#dimensions}}
### {{id}}. {{name}} {{status}}

- **得分**: {{score}}/100
- **权重**: {{weight}}%
- **关键指标**:
{{#metrics}}
  - {{name}}: {{value}} {{unit}}
{{/metrics}}

{{#issues}}
#### 发现问题

{{#.}}
- [{{priority}}] {{description}}
  - 位置: {{location}}
  - 建议: {{suggestion}}
{{/.}}

{{/issues}}

{{^issues}}
✅ 本维度未发现问题
{{/issues}}

**详细报告**: [{{outputFile}}](./{{outputFile}})

---

{{/dimensions}}

## 🎯 通过标准检查结果

### 必须满足项 (Mandatory)

| 标准 | 要求 | 实际 | 状态 |
|------|------|------|------|
| 高优先级漏洞 | = 0 | {{highIssues}} | {{#highIssues}}❌{{/highIssues}}{{^highIssues}}✅{{/highIssues}} |
| 中优先级漏洞 | = 0 | {{mediumIssues}} | {{#mediumIssues}}❌{{/mediumIssues}}{{^mediumIssues}}✅{{/mediumIssues}} |
| 测试覆盖率 | ≥ 99% | {{testCoverage}}% | {{#testCoveragePass}}✅{{/testCoveragePass}}{{^testCoveragePass}}❌{{/testCoveragePass}} |
| API平均响应 | < 3s | {{avgApiResponse}}s | {{#apiResponsePass}}✅{{/apiResponsePass}}{{^apiResponsePass}}❌{{/apiResponsePass}} |
| 页面加载时间 | < 3s | {{avgPageLoad}}s | {{#pageLoadPass}}✅{{/pageLoadPass}}{{^pageLoadPass}}❌{{/pageLoadPass}} |
| 工作流通过率 | = 100% | {{workflowPassRate}}% | {{#workflowPass}}✅{{/workflowPass}}{{^workflowPass}}❌{{/workflowPass}} |

### 建议满足项 (Recommended)

| 标准 | 要求 | 实际 | 状态 |
|------|------|------|------|
| 低优先级漏洞 | < 10 | {{lowIssues}} | {{#lowIssuesPass}}✅{{/lowIssuesPass}}{{^lowIssuesPass}}⚠️{{/lowIssuesPass}} |
| 数据库查询 | < 100ms | {{avgDbQuery}}ms | {{#dbQueryPass}}✅{{/dbQueryPass}}{{^dbQueryPass}}⚠️{{/dbQueryPass}} |
| 代码重复率 | < 5% | {{codeDuplication}}% | {{#duplicationPass}}✅{{/duplicationPass}}{{^duplicationPass}}⚠️{{/duplicationPass}} |

---

## 🔴 高优先级问题清单 (必须立即修复)

{{#highPriorityIssues}}
### {{index}}. {{title}}

- **维度**: {{dimension}}
- **位置**: {{location}}
- **问题描述**: {{description}}
- **影响范围**: {{impact}}
- **修复建议**: {{suggestion}}
- **预计工时**: {{estimatedHours}}小时

---
{{/highPriorityIssues}}

{{^highPriorityIssues}}
✅ 未发现高优先级问题
{{/highPriorityIssues}}

## 🟡 中优先级问题清单 (建议本周修复)

{{#mediumPriorityIssues}}
### {{index}}. {{title}}

- **维度**: {{dimension}}
- **位置**: {{location}}
- **问题描述**: {{description}}
- **修复建议**: {{suggestion}}

---
{{/mediumPriorityIssues}}

{{^mediumPriorityIssues}}
✅ 未发现中优先级问题
{{/mediumPriorityIssues}}

## 🟢 低优先级问题清单 (可规划修复)

{{#lowPriorityIssues}}
### {{index}}. {{title}}

- **维度**: {{dimension}}
- **位置**: {{location}}
- **问题描述**: {{description}}
- **修复建议**: {{suggestion}}

---
{{/lowPriorityIssues}}

{{^lowPriorityIssues}}
✅ 未发现低优先级问题
{{/lowPriorityIssues}}

---

## 💡 改进建议

### 立即处理 (本周内)

{{#immediateActions}}
1. {{.}}
{{/immediateActions}}

### 短期优化 (本月内)

{{#shortTermActions}}
1. {{.}}
{{/shortTermActions}}

### 长期规划 (下版本)

{{#longTermActions}}
1. {{.}}
{{/longTermActions}}

---

## 📁 附件清单

- [性能测试报告](./attachments/performance-report.md)
- [安全扫描报告](./attachments/security-scan.md)
- [测试覆盖率报告](./attachments/coverage-report.html)
- [API文档](./attachments/api-docs.md)
- [工作流验证截图](./attachments/workflow-screenshots/)

---

## 📝 验收结论

{{conclusion}}

**验收专家**: AI第三方验收专家  
**验收日期**: {{acceptanceTime}}  
**报告版本**: v1.0

---

*本报告由 AI第三方验收专家 自动生成*