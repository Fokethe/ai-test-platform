---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/product-brief-ai-test-platform-1-2026-03-19.md
  - d:/ai-test-platform-1/_bmad-output/project-context.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/README.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/package.json
  - d:/ai-test-platform-1/ai-test-platform/my-app/prisma/schema.prisma
workflowType: prd
projectType: saas_b2b
domain: general
complexity: medium
projectContext: brownfield
date: 2026-03-19
classification:
  projectType: saas_b2b
  domain: general
  complexity: medium
  projectContext: brownfield
documentCounts:
  briefs: 1
  project_context: 1
  project_docs: 3
  research: 0
status: complete
---

# Product Requirements Document - ai-test-platform-1

**Author:** Fokethe  
**Date:** 2026-03-19

## Executive Summary

`ai-test-platform-1` 是面向 QA 团队与质量负责人构建的一体化智能测试平台。产品目标是将“需求输入 -> 测试设计 -> 执行验证 -> 缺陷闭环 -> 质量评估”流程标准化、数据化、自动化。

本版本 PRD 的核心聚焦点：
- 用统一的数据模型承接测试资产（需求、测试、运行、问题）
- 用可配置的 RAG 引擎提升测试点生成、用例建议与问答质量
- 用可追踪的评估体系（ragas、Grouse、DeepEval）持续优化模型与检索效果
- 在 B2B 场景下保障权限边界、审计可追溯与可扩展性

### Product Differentiator

- 不是“单点测试工具”，而是“测试闭环协同平台”
- 不是“外挂式 AI”，而是“RAG 深度融入测试工作流”
- 不是“静态配置”，而是“可观测、可评估、可持续迭代的质量系统”

### Project Classification

- 项目类型：`saas_b2b`（Web 平台）
- 领域：`general`（质量工程/测试协同）
- 项目上下文：`brownfield`（已有代码与数据模型，持续重构迭代）

---

## Success Criteria

### User Success Metrics

1. 需求到首版测试点生成时间较基线下降 >= 50%
2. AI 生成用例的人工采纳率 >= 60%
3. 从执行失败到 Issue 建立平均耗时 <= 5 分钟
4. 核心用户（QA）周活跃率 >= 70%

### Business Success Metrics

1. 单项目测试闭环周期（需求到验证完成）下降 >= 30%
2. 高严重级缺陷的发现前置率提升 >= 25%
3. 平台承载项目数季度增长 >= 20%
4. 测试资产复用率（跨迭代复用）>= 40%

### RAG Quality Metrics

1. 检索上下文命中率（Top-K 命中人工标注证据）>= 0.80
2. 答案忠实度（Faithfulness）>= 0.80（ragas）
3. 答案相关性（Answer Relevancy）>= 0.78（ragas）
4. 错误引用率 <= 5%

---

## Product Scope

### MVP Scope (Phase 1)

1. 账号/权限/工作空间/项目基础管理
2. 需求输入与测试点、用例生成基础链路
3. Test/Run/Execution/Issue 核心对象管理
4. RAG V1（查询构建、路由、索引、检索、生成、评估）
5. 基础可观测与评估看板

### Growth Scope (Phase 2)

1. 多项目知识复用与跨项目检索
2. 企业级集成（Jira、TestRail、Webhook 双向同步增强）
3. 运行策略推荐与自动回归编排
4. 多模型策略与成本-质量自动平衡

### Vision Scope (Phase 3)

1. 质量协同中枢（质量风险预测、回归优先级智能建议）
2. 组织级质量基线与治理体系
3. 面向不同业务域的 RAG 策略模板市场

---

## User Journeys

### Journey 1: 需求到测试资产

1. QA 上传需求文档或粘贴需求文本
2. 系统抽取测试点并建议覆盖维度
3. QA 选择生成策略（Multi Query / HyDE / Decomposition）
4. 系统生成测试用例初稿并结构化入库
5. QA 审校并发布到测试库

### Journey 2: 执行到问题闭环

1. QA 创建 Run，选择 Suite/Case 集合
2. 系统执行并回传 Execution 状态与日志
3. 失败结果自动建议关联 Issue 模板
4. QA 确认并创建 Issue，分配责任人
5. 修复后触发回归，Issue 关闭并留痕

### Journey 3: 质量运营与策略优化

1. QA Lead 查看测试产能与缺陷趋势
2. 观察 RAG 质量指标与成本指标
3. 调整路由、重排序与生成策略
4. 对比前后效果，沉淀最佳实践模板

### Journey 4: 跨角色质量协同（PM/研发负责人）

1. PM 查看需求覆盖率与未验证风险点
2. 研发负责人查看缺陷趋势与回归状态
3. 双方在质量看板确认发布门禁阈值
4. 不满足阈值时触发补测或修复任务
5. 满足阈值后批准发布并保留决策留痕

---

## Domain Requirements

> 本项目不属于强监管行业（如医疗/金融），但作为企业 B2B 质量平台，必须满足组织级治理需求。

### DR1. 审计与追踪

- 所有关键操作（创建/更新/删除/执行/路由变更）必须可审计。
- 关键事件应保留操作人、时间、对象、变更摘要。

### DR2. 权限与数据边界

- 跨工作空间数据默认隔离。
- 用户权限至少覆盖角色、项目、资源级访问控制。

### DR3. 可复盘性

- 生成答案必须可追踪到检索证据与提示词版本。
- 评估结果必须可回放与对比（版本化）。

---

## Innovation Analysis

### IA1. 混合检索创新

- 单次问题可同时构建关系型、图谱、向量三种查询，并进行融合检索。

### IA2. 可路由的 RAG 引擎

- 将“逻辑路由（数据源）”与“语义路由（提示词）”解耦，实现策略可配置。

### IA3. 评估驱动迭代

- 通过 ragas / Grouse / DeepEval 的指标联动优化，形成闭环调参机制。

---

## Project-Type Requirements (SaaS B2B + Web App)

### Tenant & Org Model

1. 支持工作空间级组织隔离。
2. 支持项目级授权与成员管理。

### RBAC Matrix

1. 至少支持 `ADMIN/USER/GUEST` 角色。
2. 关键管理操作仅限管理员执行。

### Subscription Tiers

1. 至少支持 `Free/Team/Enterprise` 三档套餐，按工作空间绑定套餐策略。
2. 不同套餐在项目数、成员数、评测任务配额上具备可配置上限与超额告警。

### Compliance Requirements

1. 需满足企业级审计与数据保护要求（含操作审计、敏感信息保护、最小权限控制）。
2. 支持输出合规检查清单与证据导出，用于外部审计或客户安全评估。

### Integration Requirements

1. 支持 Webhook 与主流测试/缺陷系统集成。
2. 集成失败具备重试和告警能力。

### Web Platform Requirements

1. 主流现代浏览器兼容（Chrome/Edge/Safari/Firefox 最新两个大版本）。
2. 仪表盘核心页面支持响应式布局。

---

## Functional Requirements

### A. Workspace & Project Governance

- FR1: 平台管理员可以创建、更新和归档工作空间。
- FR2: 平台管理员可以在工作空间内创建项目并分配成员。
- FR3: 项目成员可以查看其有权限访问的项目资产列表。
- FR4: 平台管理员可以按项目维度配置基础系统信息（系统/页面）。

### B. Identity, Authentication & Authorization

- FR5: 用户可以通过邮箱和密码注册及登录系统。
- FR6: 系统可以基于角色限制管理类操作访问权限。
- FR7: 系统可以在会话中识别当前用户身份并用于资源鉴权。
- FR8: 管理员可以管理用户状态（启用/禁用）与角色。

### C. Requirement Ingestion & Structuring

- FR9: 用户可以上传或粘贴需求文本作为测试设计输入。
- FR10: 系统可以从需求中提取测试点并结构化存储。
- FR11: 用户可以查看、编辑并确认测试点。
- FR12: 系统可以将测试点与需求对象建立可追踪关联。

### D. Test Asset Lifecycle

- FR13: 用户可以创建 CASE/SUITE/FOLDER 三类测试资产。
- FR14: 用户可以按项目、类型、标签、关键字筛选测试资产。
- FR15: 用户可以批量导入、批量更新或批量删除测试资产。
- FR16: 系统可以保存测试资产的来源信息（人工/AI/导入）。
- FR17: 用户可以将测试资产关联到需求和执行记录。

### E. RAG Query Construction

- FR18: 系统可以针对同一问题构建关系型数据库查询。
- FR19: 系统可以针对同一问题构建图数据库查询。
- FR20: 系统可以针对同一问题构建向量数据库查询。
- FR21: 系统可以对同一问题并发执行多数据源查询并汇总候选证据。

### F. RAG Types

- FR22: 用户可以启用 Multi Query 策略以扩展问题表达。
- FR23: 用户可以启用 RAG/RAC Fusion 策略以融合多路检索结果。
- FR24: 用户可以启用 HyDE 策略生成假设文档后再检索。
- FR25: 用户可以启用 Decomposition 策略将复杂问题拆分后检索。

### G. Routing

- FR26: 系统可以基于规则进行逻辑路由并选择数据源路径。
- FR27: 系统可以基于问题语义进行提示词路由。
- FR28: 用户可以为不同场景配置提示词模板并选择启用版本。

### H. Indexing

- FR29: 系统可以对文档进行语义切分并生成索引单元。
- FR30: 系统可以为同一文档构建多表示索引（原文/摘要等）。
- FR31: 系统可以将文档摘要写入向量库与图数据库用于混合检索。
- FR32: 系统可以接入特殊嵌入策略（如 ColBERT 类能力）。
- FR33: 系统可以构建层次化索引（RAPTOR：聚类簇/子簇）。

### I. Retrieval

- FR34: 系统可以对候选文档执行 Refinement 生成精修上下文。
- FR35: 系统可以对候选文档执行 Reranking 并按相关性输出排序结果。
- FR36: 用户可以查看每次检索的证据来源与排序依据。

### J. Generation

- FR37: 系统可以在生成阶段执行主动检索（Active Retrieval）。
- FR38: 系统可以启用 Self-RAG / RRR 等可控生成策略。
- FR39: 系统可以将答案与引用证据一并返回并记录版本。

### K. Evals & Observability

- FR40: 系统可以基于 ragas 对 RAG 结果进行自动评估。
- FR41: 系统可以基于 Grouse 对生成质量进行评估。
- FR42: 系统可以基于 DeepEval 执行评测任务并输出报告。
- FR43: 用户可以在看板中查看检索、生成、评估与成本指标。
- FR44: 用户可以比较不同策略版本在同一评测集上的效果差异。

### L. Execution & Issue Management

- FR45: 用户可以创建并启动测试运行任务（Run）。
- FR46: 系统可以记录每条执行结果（Execution）及状态变化。
- FR47: 用户可以从失败执行快速创建并关联 Issue。
- FR48: 用户可以跟踪 Issue 生命周期并关联回归验证结果。

### M. Integration & Notification

- FR49: 系统可以通过 Webhook 对外发送关键事件通知。
- FR50: 用户可以配置系统通知并查看未读通知状态。

---

## Non-Functional Requirements

### Performance

- NFR1: 在 100 并发用户下，常规 API 请求 95 分位响应时间 <= 800ms。
- NFR2: RAG 检索+生成链路在标准问题集上 95 分位总时延 <= 8s。
- NFR3: 测试资产列表分页查询在 10 万级数据规模下首屏响应 <= 1.5s。

### Reliability

- NFR4: 生产环境月度可用性目标 >= 99.9%。
- NFR5: 在每周回放测试中，执行任务状态更新的重复写入率必须 = 0%，并通过数据库审计日志与回放报告验证。
- NFR6: 关键后台任务失败后应在 1 分钟内自动重试并记录告警事件。

### Security

- NFR7: 所有受保护接口在发布前权限回归测试中的资源级越权通过率必须 = 0%，并保留自动化测试报告。
- NFR8: 敏感配置（API Key、Secret）必须加密存储，季度密钥扫描覆盖率必须 = 100%，且明文返回事件数必须 = 0。
- NFR9: 所有写操作的审计日志覆盖率必须 = 100%，且日志完整性（操作者、对象、时间、变更摘要）周度抽样合格率 >= 99%。

### Scalability

- NFR10: 在 10x 数据量压测场景下，核心 API 错误率必须 <= 1%，且 95 分位响应时间相对基线退化不得超过 50%。
- NFR11: RAG 索引批处理任务在单批失败后 10 分钟内必须可从最近检查点恢复，周度恢复成功率 >= 99%。

### Evaluation & Quality

- NFR12: RAG 评测任务对同一策略与数据集连续执行 3 次时，核心指标方差必须 <= 0.02，并记录策略版本、数据集版本与结果版本。
- NFR13: 评测结果面板刷新延迟 <= 5 分钟，确保策略调整可快速反馈。

### Usability & Accessibility

- NFR14: 核心操作路径（需求导入、用例生成、执行、建缺陷）应在 5 步内完成。
- NFR15: 核心页面应满足 WCAG 2.1 AA 的基础可访问性要求（键盘可达、对比度、语义标签）。

### Integration

- NFR16: 外部集成调用失败时应支持指数退避重试，瞬时故障场景下 5 分钟内重试恢复成功率必须 >= 95%，且最大重试次数可配置。
- NFR17: 对外 Webhook 交付成功率目标 >= 99%，并可查询投递历史。

---

## Risks, Assumptions, and Dependencies

### Assumptions

1. 团队已具备基本测试流程与资产沉淀基础。
2. 项目允许通过配置迭代优化 RAG 策略，不追求一次到位。

### Risks

1. 多数据源混合检索可能带来成本上升与时延抖动。
2. 评估体系若无稳定标注集，优化方向可能失真。
3. 历史模型与新模型并存期间存在迁移一致性风险。

### Dependencies

1. 稳定的关系库、向量库、图数据库访问能力。
2. 统一身份认证与权限体系。
3. 可持续维护的评测数据集与基线标准。

---

## Traceability Matrix (Summary)

- Vision -> FR1-8, FR13-17, FR18-44, FR45-50
- Success Criteria -> FR22-25, FR34-44, NFR1-3, NFR12-13
- User Journey 1 -> FR9-17, FR18-33
- User Journey 2 -> FR45-48, NFR4-6
- User Journey 3 -> FR40-44, NFR12-13
- User Journey 4 -> FR1-8, FR47-50, NFR14-17

---

## Next Steps

1. 进入 `VP`（Validate PRD）做完整一致性与可测性校验。
2. 进入 `CA`（Create Architecture）将 FR/NFR 映射为架构决策。
3. 进入 `CE`（Create Epics & Stories）把 FR 分解为执行计划。
