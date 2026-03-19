---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/prd.md
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/architecture.md
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/prd-validation-report.md
  - d:/ai-test-platform-1/_bmad-output/planning-artifacts/product-brief-ai-test-platform-1-2026-03-19.md
  - d:/ai-test-platform-1/_bmad-output/project-context.md
workflowType: epics-and-stories
project_name: ai-test-platform-1
user_name: Fokethe
date: 2026-03-19
status: complete
---

# ai-test-platform-1 - Epic Breakdown

## Overview

本文件将 PRD 与 Architecture 中的需求分解为可实施的 Epic 与 Story，目标是：

- 每个 Epic 都具备独立用户价值
- 每个 Story 都可由单个开发代理在一个迭代窗口内完成
- 所有 FR/NFR 均可追踪到具体 Story
- Story 依赖只允许依赖同 Epic 的前置 Story，不依赖未来 Story

## Requirements Inventory

### Functional Requirements

FR1: 平台管理员可以创建、更新和归档工作空间。  
FR2: 平台管理员可以在工作空间内创建项目并分配成员。  
FR3: 项目成员可以查看其有权限访问的项目资产列表。  
FR4: 平台管理员可以按项目维度配置基础系统信息（系统/页面）。  
FR5: 用户可以通过邮箱和密码注册及登录系统。  
FR6: 系统可以基于角色限制管理类操作访问权限。  
FR7: 系统可以在会话中识别当前用户身份并用于资源鉴权。  
FR8: 管理员可以管理用户状态（启用/禁用）与角色。  
FR9: 用户可以上传或粘贴需求文本作为测试设计输入。  
FR10: 系统可以从需求中提取测试点并结构化存储。  
FR11: 用户可以查看、编辑并确认测试点。  
FR12: 系统可以将测试点与需求对象建立可追踪关联。  
FR13: 用户可以创建 CASE/SUITE/FOLDER 三类测试资产。  
FR14: 用户可以按项目、类型、标签、关键字筛选测试资产。  
FR15: 用户可以批量导入、批量更新或批量删除测试资产。  
FR16: 系统可以保存测试资产的来源信息（人工/AI/导入）。  
FR17: 用户可以将测试资产关联到需求和执行记录。  
FR18: 系统可以针对同一问题构建关系型数据库查询。  
FR19: 系统可以针对同一问题构建图数据库查询。  
FR20: 系统可以针对同一问题构建向量数据库查询。  
FR21: 系统可以对同一问题并发执行多数据源查询并汇总候选证据。  
FR22: 用户可以启用 Multi Query 策略以扩展问题表达。  
FR23: 用户可以启用 RAG/RAC Fusion 策略以融合多路检索结果。  
FR24: 用户可以启用 HyDE 策略生成假设文档后再检索。  
FR25: 用户可以启用 Decomposition 策略将复杂问题拆分后检索。  
FR26: 系统可以基于规则进行逻辑路由并选择数据源路径。  
FR27: 系统可以基于问题语义进行提示词路由。  
FR28: 用户可以为不同场景配置提示词模板并选择启用版本。  
FR29: 系统可以对文档进行语义切分并生成索引单元。  
FR30: 系统可以为同一文档构建多表示索引（原文/摘要等）。  
FR31: 系统可以将文档摘要写入向量库与图数据库用于混合检索。  
FR32: 系统可以接入特殊嵌入策略（如 ColBERT 类能力）。  
FR33: 系统可以构建层次化索引（RAPTOR：聚类簇/子簇）。  
FR34: 系统可以对候选文档执行 Refinement 生成精修上下文。  
FR35: 系统可以对候选文档执行 Reranking 并按相关性输出排序结果。  
FR36: 用户可以查看每次检索的证据来源与排序依据。  
FR37: 系统可以在生成阶段执行主动检索（Active Retrieval）。  
FR38: 系统可以启用 Self-RAG / RRR 等可控生成策略。  
FR39: 系统可以将答案与引用证据一并返回并记录版本。  
FR40: 系统可以基于 ragas 对 RAG 结果进行自动评估。  
FR41: 系统可以基于 Grouse 对生成质量进行评估。  
FR42: 系统可以基于 DeepEval 执行评测任务并输出报告。  
FR43: 用户可以在看板中查看检索、生成、评估与成本指标。  
FR44: 用户可以比较不同策略版本在同一评测集上的效果差异。  
FR45: 用户可以创建并启动测试运行任务（Run）。  
FR46: 系统可以记录每条执行结果（Execution）及状态变化。  
FR47: 用户可以从失败执行快速创建并关联 Issue。  
FR48: 用户可以跟踪 Issue 生命周期并关联回归验证结果。  
FR49: 系统可以通过 Webhook 对外发送关键事件通知。  
FR50: 用户可以配置系统通知并查看未读通知状态。

### NonFunctional Requirements

NFR1: 在 100 并发用户下，常规 API 请求 95 分位响应时间 <= 800ms。  
NFR2: RAG 检索+生成链路在标准问题集上 95 分位总时延 <= 8s。  
NFR3: 测试资产列表分页查询在 10 万级数据规模下首屏响应 <= 1.5s。  
NFR4: 生产环境月度可用性目标 >= 99.9%。  
NFR5: 执行任务状态更新的重复写入率必须 = 0%，并通过审计日志与回放报告验证。  
NFR6: 关键后台任务失败后应在 1 分钟内自动重试并记录告警事件。  
NFR7: 受保护接口资源级越权通过率必须 = 0%，并保留自动化测试报告。  
NFR8: 敏感配置加密存储，季度密钥扫描覆盖率必须 = 100%，明文返回事件数必须 = 0。  
NFR9: 写操作审计日志覆盖率必须 = 100%，关键字段周度抽样合格率 >= 99%。  
NFR10: 10x 数据量压测下核心 API 错误率 <= 1%，95 分位响应退化不超过 50%。  
NFR11: RAG 索引任务单批失败后 10 分钟内可从检查点恢复，周度恢复成功率 >= 99%。  
NFR12: 同一策略/数据集连续评测 3 次核心指标方差 <= 0.02，并记录版本。  
NFR13: 评测结果面板刷新延迟 <= 5 分钟。  
NFR14: 核心操作路径应在 5 步内完成。  
NFR15: 核心页面满足 WCAG 2.1 AA 基础可访问性要求。  
NFR16: 外部集成失败时 5 分钟内重试恢复成功率 >= 95%，最大重试次数可配置。  
NFR17: 对外 Webhook 交付成功率 >= 99%，并可查询投递历史。

### Additional Requirements

- AR1: 采用模块化单体架构，严格区分 `app/components/lib/prisma` 边界。  
- AR2: API 必须统一使用 `successResponse/errorResponse/listResponse` 契约。  
- AR3: 鉴权统一基于 `session.user.id` 做资源级权限校验。  
- AR4: RAG 按 Planner -> Router -> Retriever -> Generator -> Evaluator 分层实施。  
- AR5: 必须支持审计证据导出，用于外部安全评估。  
- AR6: 支持 `Free/Team/Enterprise` 套餐与配额治理。  
- AR7: 保持 Brownfield 连续演进，不破坏既有 Next.js + Prisma 工程基线。

### UX Design Requirements

当前无独立 `ux-design.md` 输入文档，按 PRD 与 NFR 抽取 UX 约束：

UX-DR1: 需求导入 -> 用例生成 -> 执行 -> 建缺陷路径需控制在 5 步内（NFR14）。  
UX-DR2: 核心页面满足键盘可达、语义标签、对比度基础标准（NFR15）。  
UX-DR3: 质量看板需支持跨角色（QA/PM/研发负责人）一致视图（Journey 4）。

### FR Coverage Map

FR1: Epic 1 Story 1.2  
FR2: Epic 1 Story 1.2  
FR3: Epic 1 Story 1.2  
FR4: Epic 1 Story 1.2  
FR5: Epic 1 Story 1.3  
FR6: Epic 1 Story 1.4  
FR7: Epic 1 Story 1.3  
FR8: Epic 1 Story 1.4  
FR9: Epic 2 Story 2.1  
FR10: Epic 2 Story 2.1  
FR11: Epic 2 Story 2.2  
FR12: Epic 2 Story 2.2  
FR13: Epic 2 Story 2.3  
FR14: Epic 2 Story 2.3  
FR15: Epic 2 Story 2.4  
FR16: Epic 2 Story 2.4  
FR17: Epic 2 Story 2.4  
FR18: Epic 3 Story 3.1  
FR19: Epic 3 Story 3.1  
FR20: Epic 3 Story 3.1  
FR21: Epic 3 Story 3.1  
FR22: Epic 3 Story 3.2  
FR23: Epic 3 Story 3.2  
FR24: Epic 3 Story 3.2  
FR25: Epic 3 Story 3.2  
FR26: Epic 3 Story 3.3  
FR27: Epic 3 Story 3.4  
FR28: Epic 3 Story 3.4  
FR29: Epic 4 Story 4.1  
FR30: Epic 4 Story 4.2  
FR31: Epic 4 Story 4.2  
FR32: Epic 4 Story 4.3  
FR33: Epic 4 Story 4.4  
FR34: Epic 5 Story 5.1  
FR35: Epic 5 Story 5.2  
FR36: Epic 5 Story 5.1  
FR37: Epic 5 Story 5.3  
FR38: Epic 5 Story 5.4  
FR39: Epic 5 Story 5.3  
FR40: Epic 6 Story 6.1  
FR41: Epic 6 Story 6.1  
FR42: Epic 6 Story 6.1  
FR43: Epic 6 Story 6.2  
FR44: Epic 6 Story 6.3  
FR45: Epic 7 Story 7.1  
FR46: Epic 7 Story 7.2  
FR47: Epic 7 Story 7.3  
FR48: Epic 7 Story 7.4  
FR49: Epic 8 Story 8.1  
FR50: Epic 8 Story 8.2

### NFR Coverage Map

NFR1: Epic 2 Story 2.3, Epic 7 Story 7.2  
NFR2: Epic 5 Story 5.3  
NFR3: Epic 2 Story 2.3  
NFR4: Epic 7 Story 7.1  
NFR5: Epic 7 Story 7.2  
NFR6: Epic 7 Story 7.1, Epic 8 Story 8.3  
NFR7: Epic 1 Story 1.4  
NFR8: Epic 1 Story 1.4, Epic 8 Story 8.3  
NFR9: Epic 1 Story 1.4, Epic 8 Story 8.4  
NFR10: Epic 8 Story 8.3  
NFR11: Epic 4 Story 4.4  
NFR12: Epic 6 Story 6.1, Story 6.4  
NFR13: Epic 6 Story 6.2, Story 6.4  
NFR14: Epic 2 Story 2.2, Epic 6 Story 6.2  
NFR15: Epic 2 Story 2.2, Epic 6 Story 6.2  
NFR16: Epic 8 Story 8.3  
NFR17: Epic 8 Story 8.1, Story 8.3

## Epic List

### Epic 1: 组织治理与身份权限
建立可审计的账号、会话、角色与工作空间治理能力，让团队成员安全进入系统并开展协作。  
**FRs covered:** FR1-FR8

### Epic 2: 需求到测试资产闭环
将需求输入、测试点提取、资产结构化管理整合为可追踪流程，提升测试设计效率。  
**FRs covered:** FR9-FR17

### Epic 3: RAG 查询与路由引擎
实现多数据源查询构建与策略路由，支持同一问题在不同检索路径中可配置执行。  
**FRs covered:** FR18-FR28

### Epic 4: RAG 索引体系
构建语义切分、多表示索引与层次化索引，为高质量检索提供稳定基础。  
**FRs covered:** FR29-FR33

### Epic 5: 检索生成与可解释回答
打通精修、重排序、主动检索与可控生成，输出可引用、可追溯的答案。  
**FRs covered:** FR34-FR39

### Epic 6: 评测与质量运营
形成评测任务、质量看板与策略对比闭环，使 RAG 能力可持续优化。  
**FRs covered:** FR40-FR44

### Epic 7: 执行与问题闭环
支持运行任务、执行记录、Issue 生命周期与回归关联，形成质量执行闭环。  
**FRs covered:** FR45-FR48

### Epic 8: 集成通知与商业化治理
实现 Webhook 与通知交付能力，并支持套餐与合规证据输出，支撑企业化落地。  
**FRs covered:** FR49-FR50

## Epic 1: 组织治理与身份权限

目标：让平台管理员和项目成员在安全边界内完成组织治理与访问控制。

### Story 1.1: 基线工程与环境校准

As a 平台管理员,  
I want 在部署前完成环境与基线校准,  
So that 账号与权限功能能稳定上线。

**Implements:** AR7

**Acceptance Criteria:**
1. **Given** 现有 brownfield 代码库  
   **When** 运行 `env:check`、数据库迁移与种子脚本  
   **Then** 系统可启动并可使用默认演示账号登录  
   **And** 不破坏现有核心 API 路由结构。  
2. **Given** 环境变量缺失或无效  
   **When** 执行环境检查  
   **Then** 返回明确缺失项和修复建议  
   **And** 阻止不完整配置继续发布。

### Story 1.2: 工作空间与项目治理

As a 平台管理员,  
I want 创建和管理工作空间、项目与成员,  
So that 团队可以按组织边界开展测试协作。

**Implements:** FR1, FR2, FR3, FR4

**Acceptance Criteria:**
1. **Given** 管理员已登录  
   **When** 创建工作空间并新增项目  
   **Then** 系统保存工作空间与项目信息  
   **And** 成员可被分配到指定项目。  
2. **Given** 普通项目成员访问资产列表  
   **When** 请求其有权限的项目数据  
   **Then** 仅返回授权范围内资产  
   **And** 非授权项目不可见。  
3. **Given** 管理员进入项目配置页面  
   **When** 配置系统与页面元信息  
   **Then** 配置成功持久化  
   **And** 后续需求与测试资产可关联该层级。

### Story 1.3: 账号注册登录与会话识别

As a 项目成员,  
I want 通过邮箱密码注册并登录,  
So that 我可以在会话中持续访问授权资源。

**Implements:** FR5, FR7

**Acceptance Criteria:**
1. **Given** 新用户提交注册信息  
   **When** 信息校验通过  
   **Then** 系统创建用户账号并可用于登录  
   **And** 密码以安全方式存储。  
2. **Given** 已注册用户提交正确凭据  
   **When** 登录成功  
   **Then** 系统创建有效会话  
   **And** 后续请求可识别 `session.user.id`。  
3. **Given** 会话失效或不存在  
   **When** 访问受保护资源  
   **Then** 返回 401  
   **And** 不泄露受保护数据。

### Story 1.4: 角色授权与账号状态管理

As a 平台管理员,  
I want 管理用户角色和账号状态,  
So that 高风险操作仅由授权角色执行。

**Implements:** FR6, FR8, NFR7, NFR8, NFR9, AR2, AR3

**Acceptance Criteria:**
1. **Given** 管理员修改用户角色或启用状态  
   **When** 保存变更  
   **Then** 角色和状态立即生效  
   **And** 变更写入审计日志。  
2. **Given** 非管理员调用管理接口  
   **When** 提交管理类操作  
   **Then** 返回 403  
   **And** 越权请求被记录。  
3. **Given** 系统处理鉴权请求  
   **When** 校验资源权限  
   **Then** 必须按 `session.user.id` 做资源级判定  
   **And** 无明文敏感配置回传。

## Epic 2: 需求到测试资产闭环

目标：让 QA 能从需求快速形成高质量、可追踪的测试资产。

### Story 2.1: 需求输入与测试点提取

As a QA 工程师,  
I want 上传或粘贴需求并自动提取测试点,  
So that 我能快速获得测试设计初稿。

**Implements:** FR9, FR10

**Acceptance Criteria:**
1. **Given** QA 上传文档或粘贴需求文本  
   **When** 提交解析请求  
   **Then** 系统成功保存原始需求内容  
   **And** 返回结构化测试点候选。  
2. **Given** 需求文本包含多个功能点  
   **When** 系统完成解析  
   **Then** 测试点按功能维度分组展示  
   **And** 每个测试点包含优先级与说明。

### Story 2.2: 测试点审校与可追踪关联

As a QA 工程师,  
I want 编辑确认测试点并关联需求,  
So that 后续测试资产可完整追溯到需求来源。

**Implements:** FR11, FR12, NFR14, NFR15, UX-DR1, UX-DR2

**Acceptance Criteria:**
1. **Given** 系统生成测试点列表  
   **When** QA 编辑并确认测试点  
   **Then** 系统保存最新测试点版本  
   **And** 标记确认状态。  
2. **Given** 测试点已确认  
   **When** 查看测试点详情  
   **Then** 可看到对应需求对象与版本  
   **And** 支持从需求跳转到测试点。  
3. **Given** QA 使用键盘导航页面  
   **When** 在审校流程执行操作  
   **Then** 关键操作可达且焦点顺序正确  
   **And** 不超过约定关键路径步骤上限。

### Story 2.3: 测试资产创建与筛选

As a QA 工程师,  
I want 创建 CASE/SUITE/FOLDER 并快速筛选,  
So that 我能高效组织和定位测试资产。

**Implements:** FR13, FR14, NFR1, NFR3

**Acceptance Criteria:**
1. **Given** QA 在项目下创建测试资产  
   **When** 选择资产类型 CASE/SUITE/FOLDER  
   **Then** 系统按类型正确落库  
   **And** 层级关系可视化展示。  
2. **Given** 资产数量达到大规模  
   **When** 按项目、类型、标签、关键字筛选  
   **Then** 结果返回符合条件数据  
   **And** 分页性能满足 NFR3。  
3. **Given** 多用户并发查询资产  
   **When** 系统处理列表请求  
   **Then** 95 分位响应满足 NFR1  
   **And** 元数据分页信息完整返回。

### Story 2.4: 批量操作与来源追踪

As a QA 工程师,  
I want 批量导入更新删除并记录来源与关联,  
So that 大规模资产维护保持一致且可追踪。

**Implements:** FR15, FR16, FR17

**Acceptance Criteria:**
1. **Given** QA 上传批量文件  
   **When** 执行批量导入/更新/删除  
   **Then** 系统返回每条记录处理结果  
   **And** 失败项带可读错误原因。  
2. **Given** 资产由 AI/人工/导入创建  
   **When** 查看资产详情  
   **Then** 系统显示来源字段与来源元数据  
   **And** 可按来源筛选。  
3. **Given** 资产与需求、执行记录有关联  
   **When** 打开追踪视图  
   **Then** 可看到双向关联关系  
   **And** 关联关系支持后续回归定位。

## Epic 3: RAG 查询与路由引擎

目标：让同一问题可通过多路径检索并按策略路由，提升证据召回质量。

### Story 3.1: 三路查询构建与并发汇总

As a QA 工程师,  
I want 系统对同一问题构建关系/图/向量三路查询并并发执行,  
So that 我能获得更全面的候选证据。

**Implements:** FR18, FR19, FR20, FR21, AR4

**Acceptance Criteria:**
1. **Given** 用户输入一个复杂问题  
   **When** 触发查询构建  
   **Then** 生成关系型、图型、向量型三类查询计划  
   **And** 查询计划可被记录与追踪。  
2. **Given** 三路查询计划已生成  
   **When** 系统并发执行检索  
   **Then** 返回统一候选证据集合  
   **And** 每条证据标记来源数据源。  
3. **Given** 某一路检索失败  
   **When** 汇总结果  
   **Then** 其他检索结果仍可返回  
   **And** 失败原因进入日志与告警。

### Story 3.2: RAG 策略开关（Multi Query/HyDE/Decomposition/Fusion）

As a QA Lead,  
I want 按场景启用不同 RAG 策略,  
So that 团队可以在召回质量与成本之间平衡。

**Implements:** FR22, FR23, FR24, FR25

**Acceptance Criteria:**
1. **Given** 用户进入策略配置  
   **When** 启用 Multi Query/HyDE/Decomposition/Fusion  
   **Then** 策略状态被持久化  
   **And** 新请求按最新策略执行。  
2. **Given** 策略启用后执行检索  
   **When** 查看结果元数据  
   **Then** 可识别当前采用的策略组合  
   **And** 策略版本可追踪。

### Story 3.3: 逻辑路由规则引擎

As a QA Lead,  
I want 按问题类型配置逻辑路由规则,  
So that 系统自动选择最合适的数据源路径。

**Implements:** FR26

**Acceptance Criteria:**
1. **Given** 管理员定义路由规则（如规则优先级、匹配条件）  
   **When** 保存规则  
   **Then** 路由规则版本化生效  
   **And** 可回滚至历史版本。  
2. **Given** 用户发起检索请求  
   **When** 命中逻辑路由规则  
   **Then** 系统按规则选择目标数据源路径  
   **And** 返回命中规则说明。

### Story 3.4: 语义路由与提示词模板版本

As a QA Lead,  
I want 按语义场景选择提示词模板并管理版本,  
So that 生成质量可控且可持续优化。

**Implements:** FR27, FR28

**Acceptance Criteria:**
1. **Given** 平台存在多个提示词模板  
   **When** 为不同场景指定模板并发布版本  
   **Then** 系统记录模板版本与生效范围  
   **And** 支持按场景回溯。  
2. **Given** 请求进入语义路由阶段  
   **When** 计算语义相似度并选择模板  
   **Then** 返回选择原因与置信度  
   **And** 可用于后续评估分析。

## Epic 4: RAG 索引体系

目标：建立高可维护、高可恢复的索引管线，支撑稳定检索能力。

### Story 4.1: 语义切分与索引单元生成

As a QA 工程师,  
I want 文档被语义切分成高质量索引单元,  
So that 检索结果更精确。

**Implements:** FR29

**Acceptance Criteria:**
1. **Given** 导入的需求与知识文档  
   **When** 执行索引构建  
   **Then** 系统按语义边界切分文本  
   **And** 为每个分块生成唯一索引标识。  
2. **Given** 切分结果质量不足  
   **When** 调整切分策略参数  
   **Then** 可重新切分并覆盖旧索引  
   **And** 保留切分版本记录。

### Story 4.2: 多表示索引与摘要双写

As a QA Lead,  
I want 同一文档构建原文与摘要多表示索引,  
So that 检索可兼顾覆盖率与速度。

**Implements:** FR30, FR31

**Acceptance Criteria:**
1. **Given** 文档进入索引流水线  
   **When** 执行多表示构建  
   **Then** 生成原文表示与摘要表示  
   **And** 两种表示可关联同一源文档。  
2. **Given** 索引写入阶段  
   **When** 完成持久化  
   **Then** 向量库和图索引均成功写入摘要信息  
   **And** 任一写入失败会触发补偿与告警。

### Story 4.3: 特殊嵌入策略接入

As a 平台管理员,  
I want 通过插件方式接入特殊嵌入策略,  
So that 平台能按业务场景升级检索表示能力。

**Implements:** FR32

**Acceptance Criteria:**
1. **Given** 新嵌入策略已配置  
   **When** 触发索引构建  
   **Then** 可按策略路由选择对应嵌入器  
   **And** 输出向量维度与索引配置一致。  
2. **Given** 策略下线或异常  
   **When** 处理新请求  
   **Then** 自动回退到默认嵌入策略  
   **And** 回退事件可观测。

### Story 4.4: 层次化索引与恢复机制

As a QA Lead,  
I want 构建 RAPTOR 层次化索引并支持失败恢复,  
So that 大规模文档下检索性能与稳定性可保障。

**Implements:** FR33, NFR11

**Acceptance Criteria:**
1. **Given** 索引任务处理大规模文档  
   **When** 执行聚类与子聚类  
   **Then** 生成层次化索引结构  
   **And** 可用于分层召回。  
2. **Given** 索引任务中断  
   **When** 任务重启  
   **Then** 可从最近检查点恢复  
   **And** 10 分钟内恢复成功率满足 NFR11。

## Epic 5: 检索生成与可解释回答

目标：输出可解释、可追踪、可控的生成结果，提升 AI 答案可用性。

### Story 5.1: 检索精修与证据可解释

As a QA 工程师,  
I want 系统对候选文档精修并展示证据来源,  
So that 我能判断答案可靠性。

**Implements:** FR34, FR36

**Acceptance Criteria:**
1. **Given** 候选文档集合已返回  
   **When** 执行 refinement  
   **Then** 生成精修后上下文  
   **And** 过滤低质量噪声片段。  
2. **Given** 用户查看检索结果  
   **When** 打开证据详情  
   **Then** 可见证据来源、分数与排序理由  
   **And** 支持跳转到原始片段。

### Story 5.2: 重排序服务

As a QA 工程师,  
I want 候选文档按相关性重排序,  
So that 生成阶段优先使用最相关证据。

**Implements:** FR35

**Acceptance Criteria:**
1. **Given** 候选文档及初始分数  
   **When** 调用重排序服务  
   **Then** 输出新的排序结果  
   **And** 保留重排前后对比数据。  
2. **Given** 重排序模型不可用  
   **When** 处理请求  
   **Then** 回退到基础排序策略  
   **And** 返回降级标记。

### Story 5.3: 主动检索生成与引用返回

As a QA 工程师,  
I want 生成阶段主动检索并返回引用证据,  
So that 答案可直接用于测试设计与复盘。

**Implements:** FR37, FR39, NFR2

**Acceptance Criteria:**
1. **Given** 生成请求进入回答阶段  
   **When** 检测证据不足  
   **Then** 自动触发主动检索补充上下文  
   **And** 再执行答案生成。  
2. **Given** 答案生成成功  
   **When** 返回结果  
   **Then** 包含引用证据列表与版本信息  
   **And** 端到端时延满足 NFR2。

### Story 5.4: Self-RAG/RRR 可控生成策略

As a QA Lead,  
I want 启用可控生成策略并配置阈值,  
So that 答案质量在不同场景下稳定可控。

**Implements:** FR38

**Acceptance Criteria:**
1. **Given** 管理员配置 Self-RAG/RRR 策略参数  
   **When** 发布策略版本  
   **Then** 新请求按该版本执行  
   **And** 版本可回滚。  
2. **Given** 生成置信度低于阈值  
   **When** 执行策略检查  
   **Then** 系统触发补检索或拒答策略  
   **And** 将决策原因写入日志。

## Epic 6: 评测与质量运营

目标：让 QA Lead 能持续评估策略效果并快速迭代。

### Story 6.1: 评测任务编排（ragas/Grouse/DeepEval）

As a QA Lead,  
I want 一键执行多评测框架任务并产出报告,  
So that 我可以系统化评估检索与生成质量。

**Implements:** FR40, FR41, FR42, NFR12

**Acceptance Criteria:**
1. **Given** 已选择策略版本和评测数据集  
   **When** 触发评测任务  
   **Then** 系统执行 ragas/Grouse/DeepEval 流程  
   **And** 产出统一评测报告。  
2. **Given** 同一策略和数据集连续运行 3 次  
   **When** 比较结果  
   **Then** 核心指标方差满足 NFR12  
   **And** 全部版本信息可追踪。

### Story 6.2: 质量与成本统一看板

As a QA Lead,  
I want 在一个看板查看检索、生成、评测与成本指标,  
So that 我能快速定位质量与成本异常。

**Implements:** FR43, NFR13, UX-DR3

**Acceptance Criteria:**
1. **Given** 用户进入质量看板  
   **When** 选择项目和时间范围  
   **Then** 显示检索命中、生成质量、评测结果与成本指标  
   **And** 支持按角色查看核心指标。  
2. **Given** 后台有新评测结果  
   **When** 面板刷新  
   **Then** 刷新延迟满足 NFR13  
   **And** 指标趋势可对比历史窗口。

### Story 6.3: 策略版本对比分析

As a QA Lead,  
I want 比较不同策略版本在同一数据集上的效果差异,  
So that 我能选择最优策略上线。

**Implements:** FR44

**Acceptance Criteria:**
1. **Given** 至少两个策略版本有评测记录  
   **When** 发起版本对比  
   **Then** 展示关键指标差异、成本差异和稳定性差异  
   **And** 支持导出对比报告。  
2. **Given** 某版本显著劣化  
   **When** 查看对比结果  
   **Then** 系统突出异常项  
   **And** 提示回滚建议。

### Story 6.4: 评测可复现与刷新守护

As a QA Lead,  
I want 评测任务和看板刷新具备守护机制,  
So that 运营节奏不受偶发故障影响。

**Implements:** NFR12, NFR13

**Acceptance Criteria:**
1. **Given** 评测任务执行失败  
   **When** 触发重试与恢复  
   **Then** 任务可在可控窗口内恢复  
   **And** 不丢失版本元数据。  
2. **Given** 看板刷新任务异常  
   **When** 监控发现延迟超阈值  
   **Then** 触发告警并降级刷新策略  
   **And** 保持关键指标可读。

## Epic 7: 执行与问题闭环

目标：让测试运行、执行记录和缺陷处理形成端到端闭环。

### Story 7.1: 运行任务创建与启动

As a QA 工程师,  
I want 创建并启动测试运行任务,  
So that 我可以按计划执行回归与验证。

**Implements:** FR45, NFR4, NFR6

**Acceptance Criteria:**
1. **Given** QA 已选择目标用例集合  
   **When** 创建并启动 Run  
   **Then** 系统生成运行任务并进入执行态  
   **And** 记录创建人与时间。  
2. **Given** 执行任务出现暂时性失败  
   **When** 触发重试机制  
   **Then** 1 分钟内自动重试并记录告警  
   **And** 可用性目标不受明显影响。

### Story 7.2: 执行结果记录与状态流转

As a QA 工程师,  
I want 每条执行结果都有完整状态轨迹,  
So that 我可以追踪失败原因并复盘质量风险。

**Implements:** FR46, NFR1, NFR5

**Acceptance Criteria:**
1. **Given** Run 正在执行多个测试项  
   **When** 执行状态变化  
   **Then** 系统记录每条 Execution 的状态流转与时间戳  
   **And** 可查询历史轨迹。  
2. **Given** 重复上报同一状态更新  
   **When** 系统处理幂等键  
   **Then** 不产生重复脏写  
   **And** 周回放验证通过率满足 NFR5。

### Story 7.3: 失败执行快速建缺陷

As a QA 工程师,  
I want 从失败执行一键创建 Issue,  
So that 我能缩短问题流转时间。

**Implements:** FR47

**Acceptance Criteria:**
1. **Given** 某条 Execution 状态为失败  
   **When** QA 点击快速建缺陷  
   **Then** 自动带入失败上下文、日志与关键证据  
   **And** Issue 与 Execution 自动关联。  
2. **Given** QA 补充缺陷信息并提交  
   **When** 保存成功  
   **Then** Issue 进入初始状态流  
   **And** 可分配处理责任人。

### Story 7.4: Issue 生命周期与回归关联

As a QA Lead,  
I want 跟踪 Issue 生命周期并绑定回归结果,  
So that 问题闭环可以被量化和复盘。

**Implements:** FR48

**Acceptance Criteria:**
1. **Given** Issue 状态发生变化  
   **When** 从处理中到已修复再到已验证  
   **Then** 系统记录全生命周期轨迹  
   **And** 支持按状态统计。  
2. **Given** 修复后触发回归  
   **When** 回归执行结束  
   **Then** 回归结果可回写 Issue  
   **And** 闭环状态可视化展示。

## Epic 8: 集成通知与商业化治理

目标：保障事件通知可靠交付，并支持企业客户的订阅与合规治理。

### Story 8.1: Webhook 关键事件通知

As a 集成管理员,  
I want 对外发送关键事件 Webhook 并可追踪投递结果,  
So that 外部系统能及时接收测试平台事件。

**Implements:** FR49, NFR17

**Acceptance Criteria:**
1. **Given** 配置了有效 Webhook 目标  
   **When** 发生关键事件（如 Run 完成、Issue 创建）  
   **Then** 系统发送标准事件负载  
   **And** 记录投递日志。  
2. **Given** 统计周期内有大量投递  
   **When** 查看交付报表  
   **Then** 成功率不低于 NFR17  
   **And** 可筛选失败样本。

### Story 8.2: 系统通知配置与未读状态

As a 项目成员,  
I want 配置通知偏好并查看未读消息,  
So that 我不会错过关键质量事件。

**Implements:** FR50

**Acceptance Criteria:**
1. **Given** 用户进入通知设置  
   **When** 调整通知渠道和开关  
   **Then** 系统保存个人偏好  
   **And** 新通知按偏好投递。  
2. **Given** 系统产生新通知  
   **When** 用户打开通知中心  
   **Then** 未读数量准确显示  
   **And** 支持批量标记已读。

### Story 8.3: 集成重试与可靠交付守护

As a 平台管理员,  
I want 外部集成在失败时自动重试并可观测,  
So that 集成链路稳定且可审计。

**Implements:** NFR10, NFR16, NFR17, AR2

**Acceptance Criteria:**
1. **Given** 外部接口出现瞬时故障  
   **When** 执行重试策略  
   **Then** 5 分钟内恢复成功率满足 NFR16  
   **And** 超过上限后进入人工处理队列。  
2. **Given** 集成任务失败或降级  
   **When** 管理员查看运维面板  
   **Then** 可见失败原因、重试次数和最终状态  
   **And** 相关事件进入审计日志。

### Story 8.4: 合规检查清单与证据导出

As a 企业客户管理员,  
I want 导出合规检查清单和审计证据,  
So that 我可以完成外部审计与安全评估。

**Implements:** AR5, NFR9

**Acceptance Criteria:**
1. **Given** 客户选择审计时间窗口  
   **When** 触发证据导出  
   **Then** 系统输出操作日志、权限变更、关键事件报告  
   **And** 文件可追踪版本。  
2. **Given** 审计员核查导出内容  
   **When** 抽样校验关键字段  
   **Then** 字段完整性满足 NFR9  
   **And** 缺失项会被标记并告警。

### Story 8.5: 套餐与配额治理

As a 平台管理员,  
I want 配置并执行 Free/Team/Enterprise 套餐配额,  
So that 平台可按商业策略提供差异化能力。

**Implements:** AR6

**Acceptance Criteria:**
1. **Given** 管理员配置套餐能力与配额  
   **When** 工作空间绑定套餐  
   **Then** 项目数、成员数、评测任务配额即时生效  
   **And** 超额行为触发告警。  
2. **Given** 工作空间配额接近上限  
   **When** 用户继续创建资源  
   **Then** 系统给出限制提示与升级引导  
   **And** 不影响已存在资源可用性。

## Dependency and Sequencing Notes

- Epic 顺序建议：1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8。  
- 同 Epic 内故事只依赖前置故事，不依赖未来故事。  
- Epic 3-6 依赖 Epic 1-2 的身份、项目、需求与测试资产基础。  
- Epic 8 依赖 Epic 1 的权限体系与 Epic 7 的事件来源。

## Done Criteria for CE Output

- [x] FR1-FR50 全覆盖并映射到具体 Story。  
- [x] NFR1-NFR17 具备落点。  
- [x] 关键架构附加要求（AR1-AR7）已映射。  
- [x] 每条 Story 包含可测试 Given/When/Then 验收标准。  
- [x] Epic 按用户价值组织，而非技术层组织。
