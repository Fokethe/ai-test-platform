---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/prd.md
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/prd-validation-report.md
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/product-brief-ai-test-platform-1-2026-03-19.md
  - d:/ai-test-platform-1/_bmad-output/project-context.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/README.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/package.json
  - d:/ai-test-platform-1/ai-test-platform/my-app/prisma/schema.prisma
workflowType: 'architecture'
project_name: 'ai-test-platform-1'
user_name: 'Fokethe'
date: '2026-03-19'
lastStep: 8
status: 'complete'
completedAt: '2026-03-19'
---

# Architecture Decision Document - ai-test-platform-1

## Project Context Analysis

### Requirements Overview

本项目为面向 QA 团队的 B2B 测试协同平台，需求主线为：

- 业务域闭环：需求 -> 测试资产 -> 执行 -> 问题 -> 质量运营
- 资产模型统一：`Test (CASE/SUITE/FOLDER)`、`Run`、`Execution`、`Issue`、`Asset`
- RAG 全链路：查询构建、策略路由、索引、检索、生成、评估
- 多角色协同：QA、QA Lead、PM、研发负责人

FR 规模：`FR1-FR50`  
NFR 规模：`NFR1-NFR17`

### NFR 驱动架构约束

- 性能：核心 API、RAG 链路、10 万级分页检索均有明确阈值
- 可靠性：可用性、重试、幂等、失败恢复
- 安全：资源级权限校验、敏感信息保护、审计日志完备
- 可扩展：10x 数据增长、RAG 索引与评测任务可恢复与可复现
- 可用性：核心路径 5 步内、WCAG 2.1 AA 基础可达

### 当前工程基线（Brownfield）

- Runtime: Node `>=18`
- Web/App: Next.js `16.1.6`, React `19.2.3`, TypeScript `5`
- API: Next.js Route Handlers (`src/app/api/**/route.ts`)
- Auth: NextAuth `4.24.13` + Prisma Adapter
- Data: Prisma + SQLite(开发) / PostgreSQL(生产)
- Testing: Jest + Playwright
- AI/RAG: `src/lib/ai/**`（含 query/rag/reranking/generation/observability）

### Cross-Cutting Concerns

- 租户与资源边界：工作空间/项目/资源三级权限
- 审计与追踪：写操作全量日志与链路追踪
- 统一 API 契约：`successResponse/errorResponse/listResponse`
- 统一错误与重试：API 层、集成层、后台任务层三层治理
- AI 成本与质量：策略版本化、评测版本化、成本可观测

## Starter Template Evaluation

### Primary Technology Domain

`saas_b2b + web_app + ai/rag`，且项目状态为 `brownfield`。

### Selected Starter Strategy

不新建绿地 starter，保留并标准化现有工程骨架：

- 保留 `Next.js App Router + Route Handlers + Prisma`
- 保留现有目录分层：`src/app`, `src/lib`, `src/components`, `prisma`
- 以“模块化单体”作为当前阶段主架构形态

### Baseline Commands

```bash
cd ai-test-platform/my-app
npm install
npm run env:check
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Architectural Decisions Already Provided by Existing Baseline

- 前后端同仓协作与类型共享
- API 路由与页面路由统一治理
- Prisma 迁移与模型管理机制
- Jest/Playwright 双层测试基建

## Core Architectural Decisions

### Decision Priority Analysis

**Critical**

- 多租户与资源级鉴权边界
- RAG 编排引擎与多数据源检索抽象
- 测试资产闭环模型（Requirement/Test/Run/Issue）
- API 响应与错误契约统一

**Important**

- 指标与评测系统（ragas/Grouse/DeepEval）
- 后台任务恢复与重试策略
- Webhook 与外部集成可靠交付

**Deferred (Post-MVP)**

- RAG 高级策略编排控制台
- 完整第三方双向同步引擎
- 大规模图数据库在线拓扑分析

### System Style

采用 **Modular Monolith**：

- 单仓单部署单元（当前阶段）提高交付效率
- 通过明确模块边界为未来拆分服务预留扩展点
- 模块间通过 service/facade 调用，避免页面层直连复杂基础设施

### Data Architecture

**Primary Store**

- 事务主库：Prisma + SQLite/PG（业务真相来源）

**Secondary Retrieval Stores（RAG）**

- 向量检索：Vector Store Adapter（现有 `src/lib/ai/rag/vector/**`）
- 图检索：Graph Adapter（新增抽象层，先保留接口，后接具体实现）
- 关系检索：直接基于 Prisma 的结构化检索

**Key Domain Aggregates**

- Tenant 侧：Workspace / WorkspaceMember / Project
- 资产侧：Requirement / Test / Asset / CustomField
- 执行侧：Run / Execution / Issue
- AI 侧：KnowledgeEntry / AiRequirement / TestPoint

### Authentication & Security

- 身份认证：NextAuth Session（Credentials + Adapter）
- 授权模型：`ADMIN/USER/GUEST` + 项目/资源级校验
- 安全中间件：Route Handler 统一鉴权入口
- 审计策略：写操作必须记录操作者、对象、变更摘要
- 密钥策略：敏感配置加密存储、禁止明文返回

### API & Communication Patterns

- API 风格：REST-first，按资源域划分 `/api/{domain}`
- 响应契约：统一 envelope（success/list/error）
- 分页契约：统一 `buildQueryParams/buildMeta`
- 集成事件：Webhook 作为外部通知边界
- 失败治理：指数退避 + 最大重试次数可配置

### RAG Architecture Decisions

#### 1) Query Construction

- 同一用户问题生成三路检索计划：SQL / Graph / Vector
- 由 Query Planner 统一发起并汇总候选证据

#### 2) Routing

- Logic Router：按任务类型与规则选择数据源路径
- Semantic Router：按语义选择提示词模板与策略版本

#### 3) Indexing

- 语义切分 + 多表示索引（原文/摘要）
- 文档摘要写入向量与图索引
- 预留特殊嵌入策略接入点（例如 ColBERT 类）

#### 4) Retrieval

- Hybrid Retriever：向量 + 关键词 + 关系检索融合
- Reranker：相关性重排
- Refinement：上下文精修后再交给生成阶段

#### 5) Generation

- Active Retrieval + Citation 输出
- 支持 Self-RAG/RRR 策略开关（策略版本化）

#### 6) Evals

- 评测任务记录：策略版本、数据集版本、结果版本
- 指标面板：质量指标 + 成本指标 + 刷新 SLA

### Infrastructure & Deployment

- 环境分层：dev/staging/prod
- 部署形态：Web 应用 + 后台任务同域部署（MVP）
- CI 基线：lint + unit + api + e2e 关键路径
- 可观测：应用日志 + AI tracing + 指标聚合

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database**

- 表名：snake_case 复数（由 Prisma `@@map` 统一映射）
- 字段：DB 层 snake_case，TS 层 camelCase
- FK：`{entity}_id`

**API**

- 资源路径：复数名词（`/api/projects`, `/api/tests`）
- 子资源：`/api/{resource}/{id}/{subresource}`
- Query：camelCase（与 TS 调用端一致）

**Code**

- React 组件：`PascalCase.tsx`
- 工具模块：`kebab-case.ts` 或语义化模块名
- 类型定义：`src/types/**`

### Structure Patterns

- `src/app/**`：路由与页面编排，不承载复杂业务规则
- `src/lib/**`：领域服务、适配器、基础设施、策略逻辑
- `src/components/**`：UI 组件与交互容器
- `prisma/**`：数据模型、迁移、种子

### API Format Patterns

- 成功：`successResponse(data, message?)`
- 列表：`listResponse(data, meta)`
- 失败：`errorResponse(message, code, details?)`
- 错误码：鉴权 401，权限 403，资源不存在 404，参数错误 400，服务错误 5xx

### Communication Patterns

- 内部调用：Service/Façade，避免页面层直接拼接多源基础设施调用
- 外部调用：Integration Adapter 统一超时、重试、日志、幂等键
- 事件命名：`domain.entity.action`（如 `run.execution.failed`）

### Process Patterns

- Loading：统一 `loading/error/empty/data` 状态机
- Retry：仅对可恢复错误重试，业务冲突不重试
- Validation：请求入参先 `parseJsonBody + schema`，后业务校验
- Logging：关键路径记录 traceId + actorId + projectId

### Enforcement Guidelines

所有 AI Agent 必须：

1. 只在约定层做约定事（页面不实现复杂领域规则）。
2. API 全量使用统一响应与分页构建器。
3. 新增模型变更必须同步 `prisma generate` 与测试。
4. 认证鉴权统一检查 `session.user.id`。

## Project Structure & Boundaries

### Complete Project Directory Structure (Current + Target)

```text
ai-test-platform/my-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   │   ├── ai-generate/
│   │   │   ├── ai-metrics/
│   │   │   ├── requirements/
│   │   │   ├── tests/
│   │   │   ├── runs/
│   │   │   ├── issues/
│   │   │   ├── projects/
│   │   │   ├── systems/
│   │   │   └── workspaces/
│   │   └── api/
│   │       ├── auth/ users/ projects/ requirements/ tests/ runs/ issues/
│   │       ├── assets/ integrations/ notifications/ reports/ ai/ ai-metrics/
│   │       └── workspaces/ systems/ logs/
│   ├── components/
│   │   ├── ui/
│   │   ├── metrics/
│   │   ├── advanced-search/
│   │   └── navigation/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── rag/ (query, retrieval, reranking, generation, vector, cache)
│   │   │   ├── langgraph/ workflow/
│   │   │   └── observability/
│   │   ├── knowledge/
│   │   ├── security/
│   │   ├── middleware/
│   │   ├── observability/
│   │   ├── validation/
│   │   ├── api-handler.ts
│   │   ├── api-response.ts
│   │   └── auth.ts
│   └── types/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── e2e/
├── tests (via jest patterns)
├── playwright.config.ts
└── docker-compose.yml
```

### Architectural Boundaries

**Boundary A: Presentation**

- 位置：`src/app`, `src/components`
- 职责：页面编排、交互、视图状态
- 禁止：直接跨越 service 层访问多数据源

**Boundary B: Application/Domain**

- 位置：`src/lib/*`（按域拆分）
- 职责：业务规则、聚合协调、权限判断、策略编排

**Boundary C: Infrastructure**

- 位置：`src/lib/ai/rag/*`, `src/lib/db`, `prisma`, `integrations`
- 职责：数据库、向量库、图库、外部系统连接器

### Requirements to Structure Mapping

- FR1-8（治理/身份/权限） -> `api/auth`, `api/users`, `api/workspaces`, `lib/auth`, `lib/security`
- FR9-17（需求与测试资产） -> `api/requirements`, `api/tests`, `(dashboard)/requirements`, `(dashboard)/tests`
- FR18-44（RAG） -> `lib/ai/rag/**`, `lib/ai/langgraph/**`, `api/ai`, `api/ai-metrics`
- FR45-48（执行与问题） -> `api/runs`, `api/issues`, `(dashboard)/runs`, `(dashboard)/issues`
- FR49-50（集成通知） -> `api/integrations`, `api/notifications`, `api/webhook*`

### Integration Points

- Internal: Route Handlers -> Domain Services -> Prisma/Adapters
- External: Webhook/Jira/TestRail/AI Provider APIs
- Data Flow: Requirement Ingestion -> RAG Retrieval/Generation -> Test Asset Persist -> Run/Execution -> Issue -> Evals

## Architecture Validation Results

### Coherence Validation

- 技术栈兼容：Next.js/React/TypeScript/Prisma/NextAuth 组合一致
- 决策一致性：响应格式、鉴权方式、目录边界已统一
- 结构一致性：FR 到模块映射完整，边界清晰

### Requirements Coverage Validation

- FR 覆盖：`FR1-FR50` 均已映射到明确模块边界
- NFR 覆盖：性能/可靠性/安全/扩展/评估/集成均有对应架构机制
- Traceability：与 PRD 的 Journey 与 Matrix 一致

### Gap Analysis

**Critical Gaps:** None

**Important Gaps (post-architecture implementation tasks):**

1. 图数据库适配层尚需具体实现（当前定义了抽象边界）
2. 评测调度与数据集版本管理需落地任务编排器
3. Webhook 幂等键与签名验证需统一中间件沉淀

### Architecture Readiness

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence:** High

### Architecture Completeness Checklist

- [x] 项目上下文与约束分析
- [x] 核心架构决策（数据、安全、通信、RAG、部署）
- [x] 一致性规则与反冲突模式
- [x] 完整目录边界与 FR 映射
- [x] 覆盖验证与缺口分析

## Implementation Handoff

### AI Agent Guidelines

1. 先遵守本架构文档边界，再实现业务细节。
2. 所有新增 API 必须遵守统一响应与鉴权规范。
3. RAG 能力按“Planner -> Router -> Retriever -> Generator -> Evaluator”层次落地。
4. 任何跨模块调用优先复用 `lib` 层能力，避免重复实现。

### First Implementation Priorities

1. 固化 RAG Orchestrator 抽象（含关系/图/向量三路检索接口）
2. 落地评测任务流水线（ragas/Grouse/DeepEval 的任务编排与结果存储）
3. 统一集成与通知可靠性交付机制（重试、幂等、审计）
4. 完成 `FR -> Story` 的执行分解

### Next Workflow

建议下一步进入：`CE`（Create Epics & Stories）
