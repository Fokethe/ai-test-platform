# P1 新功能开发计划

> 创建时间: 2026-02-25
> 目标: 实现 PRD 中 P1 优先级功能

---

## Phase 1: 日志功能（当前进行）

### 目标
实现操作/系统/执行日志，支持查询、导出。

### 任务清单
- [ ] 数据库模型设计 (Prisma schema)
- [ ] API 端点实现 (/api/logs)
- [ ] 日志管理页面 (/admin/logs)
- [ ] 自动日志记录中间件
- [ ] 日志查询功能（按类型、时间、用户）
- [ ] 日志导出功能

### 数据模型
```typescript
interface Log {
  id: string
  type: 'OPERATION' | 'SYSTEM' | 'EXECUTION'
  level: 'INFO' | 'WARN' | 'ERROR'
  userId?: string
  action: string
  target: string
  message: string
  details?: object
  ip?: string
  createdAt: Date
}
```

### 文件产出
- `prisma/migrations/xxx_add_logs/migration.sql`
- `src/app/api/logs/route.ts`
- `src/app/(dashboard)/admin/logs/page.tsx`
- `src/lib/middleware/log.ts`
- `src/components/logs/LogTable.tsx`
- `src/components/logs/LogFilter.tsx`

---

## Phase 2: 定时任务

### 目标
Cron 表达式支持定时执行测试。

### 任务清单
- [ ] 数据库模型 (CronJob)
- [ ] Cron 解析库集成 (node-cron)
- [ ] 定时任务调度器
- [ ] 任务管理页面
- [ ] 邮件/通知集成

---

## Phase 3: Bug 管理

### 目标
测试失败自动录入 Bug，支持状态流转。

### 任务清单
- [ ] Bug 数据模型
- [ ] Bug 状态流转逻辑
- [ ] Bug 列表/详情页面
- [ ] 第三方集成 (Jira/Tapd)

---

## Phase 4: CI/CD Webhook

### 目标
支持 Jenkins/GitLab CI/GitHub Actions 触发测试。

### 任务清单
- [ ] Webhook API 端点
- [ ] 签名验证逻辑
- [ ] CI 集成文档

---

## Phase 5: 报告导出

### 目标
PDF/HTML/Excel 导出测试报告。

### 任务清单
- [ ] 导出 API 端点
- [ ] 报告模板设计
- [ ] 下载功能

---

## 进度追踪

| Phase | 状态 | 完成时间 |
|-------|------|----------|
| 日志功能 | ✅ 已完成 | 2026-02-25 |
| 定时任务 | ✅ 已完成 | 2026-02-25 |
| Bug 管理 | ✅ 已完成 | 2026-02-25 |
| CI/CD Webhook | ✅ 已完成 | 2026-02-25 |
| 报告导出 | ✅ 已完成 | 2026-02-25 |

🎉 **P1 新功能全部开发完成！** | 2026-02-25 |

---

# AI 核心能力增强计划

> 创建时间: 2026-02-26
> 参考: AITS 系统设计方案
> 目标: 引入 LangChain/LangGraph 架构，提升 AI 生成质量

---

## 技术对比分析

| 维度 | AITS 系统 | 当前项目 | 差距 |
|------|----------|----------|------|
| **AI 架构** | LangChain + LangGraph 工作流 | 简单 OpenAI 客户端调用 | 🔴 大 |
| **知识库** | RAG (ChromaDB/Milvus) + 向量检索 | 无 | 🔴 大 |
| **多模型** | 支持 OpenAI/DeepSeek/Ollama/Qwen | 仅 Moonshot | 🟡 中 |
| **视觉模型** | Qwen-VL/UI-TARS/Doubao Vision | 无 | 🔴 大 |
| **Agent 编排** | LangGraph 多 Agent 协作 | 单轮生成 | 🔴 大 |
| **MCP 支持** | 有 | 无 | 🟡 中 |

---

## 方案 A: 渐进式增强（立即开始）

> 适合资源有限，希望快速见效
> 可用模型: Kimi k2.5, 千问 3 (后期扩展 GPT/DeepSeek)
> 
> **核心需求（来自需求审问）**: 分步骤工作流：需求 → 测试点 → 用例 → Excel

### 阶段 1: 分层生成工作流 - 需求提取测试点（1 周）

#### 目标
- 实现需求→测试点的智能提取（当前缺失的核心功能）
- 解决"生成用例固定几条不智能"的问题
- 支持需求文档上传解析

#### 任务清单
- [ ] 需求文档上传功能（PDF/Word/TXT）
- [ ] 需求解析 Agent（提取功能点、业务规则）
- [ ] 测试点自动生成（测试大纲）
- [ ] 测试点人工确认/编辑界面
- [ ] 测试点与需求关联存储

#### 技术方案
```typescript
// 需求 → 测试点 工作流
const requirementToTestPoints = {
  input: '用户上传的需求文档/输入的需求描述',
  steps: [
    { agent: 'RequirementParser', output: '功能点列表' },
    { agent: 'BusinessRuleExtractor', output: '业务规则' },
    { agent: 'TestPointGenerator', output: '测试大纲（测试点列表）' }
  ],
  output: {
    testPoints: [
      { id, name, description, priority, relatedRequirement }
    ]
  }
}

// 示例：登录功能需求 → 测试点
输入: "用户登录功能，支持手机号+验证码登录，6位验证码，5分钟有效"
输出: [
  { name: "正常登录流程", priority: "P0" },
  { name: "验证码长度验证", priority: "P1" },
  { name: "验证码过期处理", priority: "P1" },
  { name: "手机号格式验证", priority: "P1" },
  { name: "并发登录场景", priority: "P2" }
]
```

#### 文件产出
- `src/lib/ai/agents/requirement-parser.ts` - 需求解析 Agent
- `src/lib/ai/agents/test-point-generator.ts` - 测试点生成 Agent
- `src/app/api/requirements/route.ts` - 需求上传 API
- `src/app/(dashboard)/ai-generate/steps/test-points/page.tsx` - 测试点确认页面
- `prisma/migrations/xxx_add_requirements/migration.sql` - 需求/测试点表

---

### 阶段 2: 分层生成工作流 - 测试点生成用例（1 周）

#### 目标
- 实现测试点→详细用例的智能生成
- 支持批量/选择性生成
- 用例质量提升（告别固定模板）

#### 任务清单
- [ ] 基于测试点的用例生成 Agent
- [ ] 支持正向/反向/边界用例类型选择
- [ ] 用例预览与编辑界面
- [ ] 用例与测试点关联
- [ ] Few-shot 示例库（基于历史用例）

#### 技术方案
```typescript
// 测试点 → 用例 工作流
const testPointToCases = {
  input: '选中的测试点 + 生成选项',
  context: await getRelevantCasesFromHistory(testPoint), // RAG 检索相似用例
  steps: [
    { agent: 'CaseGenerator', output: '初步用例草稿' },
    { agent: 'CaseReviewer', output: '质量检查报告' },
    { agent: 'CaseRefiner', output: '最终用例' }
  ],
  output: {
    testCases: [
      { title, preCondition, steps, expectation, priority, type }
    ]
  }
}
```

#### 文件产出
- `src/lib/ai/agents/case-generator.ts` - 用例生成 Agent
- `src/lib/ai/agents/case-reviewer.ts` - 用例检查 Agent
- `src/lib/ai/few-shot.ts` - 历史用例示例库
- `src/app/(dashboard)/ai-generate/steps/test-cases/page.tsx` - 用例预览页面

---

### 阶段 3: Excel 导出与执行（1 周）

#### 目标
- 实现用例→Excel的导出（测试人员执行用）
- 支持自定义 Excel 模板
- 可直接打印或导入 TestRail 等工具

#### 任务清单
- [ ] Excel 导出功能（xlsx 格式）
- [ ] 支持用例筛选后导出
- [ ] Excel 模板配置（列选择、样式）
- [ ] 导出历史记录

#### 技术方案
```typescript
// 用例 → Excel
const exportToExcel = {
  input: '选中的用例列表',
  options: {
    columns: ['编号', '标题', '前置条件', '步骤', '预期结果', '优先级'],
    template: 'standard' | 'simple' | 'detailed'
  },
  output: 'test-cases.xlsx'
}
```

#### 文件产出
- `src/lib/export/excel.ts` - Excel 导出服务
- `src/app/api/export/excel/route.ts` - Excel 导出 API
- `src/components/export/ExcelTemplateSelector.tsx` - 模板选择器

---

### 阶段 4: RAG 知识库增强（2 周）

#### 目标
- 建立向量知识库
- 生成用例与历史风格一致
- 自动关联相关需求

#### 任务清单
- [ ] ChromaDB 集成（轻量级向量数据库）
- [ ] 历史用例向量化导入
- [ ] 需求文档解析与存储
- [ ] 相似度检索服务
- [ ] 生成时上下文注入

#### 文件产出
- `src/lib/knowledge/chroma.ts` - ChromaDB 客户端
- `src/lib/knowledge/embedding.ts` - 嵌入服务
- `src/app/api/knowledge/route.ts` - 知识库 API

---

### 阶段 5: 多模型路由与优化（1 周）

#### 目标
- 统一模型管理器
- 根据任务类型选择最优模型
- 成本优化

#### 模型映射策略
| 任务类型 | 推荐模型 | 理由 |
|---------|---------|------|
| 需求分析 | 千问 3 | 推理能力强 |
| 测试点生成 | Kimi k2.5 | 中文好，成本低 |
| 用例生成 | Kimi k2.5 | 生成速度快 |
| 质量检查 | 千问 3 | 逻辑严谨 |

#### 文件产出
- `src/lib/ai/model-manager.ts` - 模型管理器
- `src/lib/ai/token-tracker.ts` - Token 统计

---

### 阶段 2: RAG 知识库增强（2 周）

#### 目标
- 建立向量知识库
- 生成用例与历史风格一致
- 自动关联相关需求

#### 任务清单
- [ ] ChromaDB 集成（轻量级向量数据库）
- [ ] 文档处理流水线（分块 → 嵌入 → 存储）
- [ ] 历史用例向量化导入
- [ ] 需求文档解析与存储
- [ ] 相似度检索服务
- [ ] 生成时上下文注入

#### 技术方案
```typescript
// 知识库服务
class KnowledgeService {
  async addDocument(doc: Document) {
    // 分块 → 嵌入 → 存储
  }
  
  async search(query: string, k: number = 5) {
    // 查询嵌入 → 相似度检索 → 返回上下文
  }
}

// 增强后的生成流程
async function generateWithRAG(requirement: string) {
  const context = await knowledgeService.search(requirement);
  const prompt = buildAugmentedPrompt(requirement, context);
  const result = await multiRoundGeneration(prompt);
  return validateResult(result);
}
```

#### 文件产出
- `src/lib/knowledge/chroma.ts` - ChromaDB 客户端
- `src/lib/knowledge/embedding.ts` - 嵌入服务
- `src/lib/knowledge/document.ts` - 文档处理
- `src/app/api/knowledge/route.ts` - 知识库 API
- `prisma/migrations/xxx_add_knowledge/migration.sql` - 知识库表

---

### 阶段 3: 多模型路由管理（1 周）

#### 目标
- 统一模型管理器
- 根据任务类型选择最优模型
- 成本优化

#### 任务清单
- [ ] 模型配置数据库表
- [ ] 统一模型管理器（ModelManager）
- [ ] 任务类型与模型映射
- [ ] 模型 fallback 机制
- [ ] Token 使用统计

#### 模型映射策略
| 任务类型 | 推荐模型 | 理由 |
|---------|---------|------|
| 需求分析 | 千问 3 | 推理能力强 |
| 用例生成 | Kimi k2.5 | 中文好，成本低 |
| 质量检查 | 千问 3 | 逻辑严谨 |
| 代码生成 | Kimi k2.5 | 代码能力强 |

#### 文件产出
- `src/lib/ai/model-manager.ts` - 模型管理器
- `src/lib/ai/token-tracker.ts` - Token 统计
- `prisma/migrations/xxx_add_llm_config/migration.sql` - 模型配置表

---

### 阶段 4: Agent 工作流编排（2 周）

#### 目标
- 引入 LangGraph 多 Agent 协作
- 可追溯每个用例的生成逻辑

#### 任务清单
- [ ] LangChain + LangGraph 集成
- [ ] 定义 Agent 状态图
- [ ] 实现各 Agent 节点
- [ ] 工作流可视化（调试）
- [ ] 人工干预点设计

#### Agent 设计
| Agent | 职责 | 模型 |
|-------|------|------|
| RequirementAgent | 解析需求，识别功能点 | 千问 3 |
| TestPointAgent | 提取测试点，分类 | Kimi k2.5 |
| CaseGenAgent | 生成详细用例 | Kimi k2.5 |
| ReviewAgent | 检查完整性，补充遗漏 | 千问 3 |

#### 文件产出
- `src/lib/ai/agents/index.ts` - Agent 注册
- `src/lib/ai/agents/requirement.ts` - 需求分析 Agent
- `src/lib/ai/agents/test-point.ts` - 测试点提取 Agent
- `src/lib/ai/agents/case-gen.ts` - 用例生成 Agent
- `src/lib/ai/agents/review.ts` - 质量检查 Agent
- `src/lib/ai/workflow.ts` - LangGraph 工作流定义

---

## 方案 B: 全量重构（长期规划）

> 适合有足够资源，追求长期竞争力
> 开发周期: 2-3 个月

### 架构升级

```
当前: 简单 API 调用
     ↓
方案 B: LangChain + LangGraph + ChromaDB + 多模型
        ├── Agent 工作流编排
        ├── RAG 知识库增强
        ├── 视觉模型集成 (Qwen-VL)
        ├── MCP 工具扩展
        └── 异步任务队列 (BullMQ)
```

### 功能扩展

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 视觉分析 | UI 截图 → 元素识别 → 用例生成 | P1 |
| API 智能测试 | OpenAPI 解析 → 自动用例生成 | P1 |
| 测试自愈 | 元素变更自动修复 | P2 |
| MCP 生态 | 浏览器/数据库/Jira 工具接入 | P2 |
| 异步队列 | BullMQ 任务调度 | P2 |

---

## 实施时间线

### 方案 A 时间线（推荐）

| 阶段 | 时间 | 内容 | 预期效果 |
|------|------|------|----------|
| 1 | 第1周 | Prompt 优化 + 多轮生成 | 生成质量 +30% |
| 2 | 第2-3周 | RAG 知识库 | 上下文关联 + 风格一致 |
| 3 | 第4周 | 多模型路由 | 成本优化 + 能力扩展 |
| 4 | 第5-6周 | Agent 工作流 | 可追溯 + 可干预 |

**总计: 6 周完成方案 A**

---

## 依赖资源

### 模型 API
- ✅ Kimi k2.5 (已有)
- ✅ 千问 3 (待接入)
- ⏳ GPT-4o (后期)
- ⏳ DeepSeek-V3 (后期)

### 数据资源
- ✅ 历史测试用例（可用于 RAG）
- ✅ 需求文档（可导入知识库）

### 技术依赖
- `langchain` - AI 应用框架
- `@langchain/core` - 核心功能
- `langgraph` - 工作流编排
- `chromadb` - 向量数据库
- `zod` - Schema 验证

---

## 风险评估

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| LangGraph 学习曲线 | 中 | 中 | 预留学习时间，先 POC 验证 |
| ChromaDB 性能瓶颈 | 低 | 中 | 数据量大时迁移到 Milvus |
| 模型 API 不稳定 | 中 | 高 | 实现 fallback 机制 |
| 生成质量不达预期 | 中 | 高 | 保留人工编辑能力 |

---

## 成功指标

| 指标 | 当前 | 目标 | 测量方式 |
|------|------|------|----------|
| 生成用例采纳率 | ~60% | >85% | 用户导入比例 |
| 生成时间 | 3-5s | <2s | 接口响应时间 |
| 用户满意度 | - | >4.5/5 | 问卷调研 |
| 重复生成率 | 高 | <20% | RAG 去重效果 |

---

## 下一步行动

1. **立即开始**: 阶段 1（Prompt 优化 + 多轮生成）
2. **准备数据**: 整理历史用例，准备 RAG 训练数据
3. **技术调研**: LangGraph POC 验证
4. **模型申请**: 千问 3 API 密钥申请

---

**计划版本**: v1.0  
**最后更新**: 2026-02-26  
**负责人**: AI Test Platform Team
