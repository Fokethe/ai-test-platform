---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - d:/ai-test-platform-1/_bmad-output/project-context.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/README.md
  - d:/ai-test-platform-1/ai-test-platform/my-app/package.json
  - d:/ai-test-platform-1/ai-test-platform/my-app/prisma/schema.prisma
date: 2026-03-19
author: Fokethe
status: complete
---

# Product Brief: ai-test-platform-1

## Executive Summary

`ai-test-platform-1` 是一款面向测试团队的智能测试平台，目标是将“需求理解 -> 测试用例设计 -> 执行验证 -> 问题追踪”的链路从分散、手工、低效，升级为统一、可追踪、可规模化的流程。

产品核心价值是：
- 降低测试设计与执行的人力成本
- 提升测试覆盖率与一致性
- 缩短需求到验证的闭环时间
- 为质量决策提供结构化数据基础

---

## Core Vision

### Problem Statement

当前多数团队在测试阶段面临四类共性问题：
- 需求到测试用例映射依赖个人经验，质量波动大
- 用例编写和维护成本高，重复劳动严重
- 执行与缺陷管理工具割裂，追踪链路断裂
- 跨角色（测试、产品、研发）协作中信息不同步

### Problem Impact

这些问题直接导致：
- 需求变更后测试响应慢，发布节奏被拖慢
- 高优先级缺陷发现滞后，线上质量风险增大
- 测试资源被低价值重复工作占用
- 质量管理难以数据化，复盘依赖主观判断

### Why Existing Solutions Fall Short

现有方案通常存在以下不足：
- 传统测试管理工具重“记录”，轻“智能生成与辅助决策”
- 自动化工具重“执行”，缺少需求语义到测试设计的桥接
- 多工具拼接后权限、数据模型、流程状态难统一
- 缺少以测试团队实际工作流为中心的一体化产品体验

### Proposed Solution

构建统一的测试工作台，覆盖以下闭环能力：
- 分层对象管理：工作空间 -> 项目 -> 系统 -> 页面 -> 测试资产
- AI 辅助生成：基于需求文本生成测试点与测试用例
- 用例管理与批量操作：统一管理 CASE/SUITE/FOLDER
- 执行与结果沉淀：运行管理、执行记录、结果统计
- 问题追踪：Issue 与测试对象、执行记录关联
- 团队协作：用户、权限、通知、系统配置和集成能力

### Key Differentiators

- 以“测试闭环”而非单点工具为设计中心
- AI 生成与结构化测试资产深度耦合，不是外挂能力
- 数据模型从一开始就支持追踪关系（需求/测试/执行/问题）
- 支持从 MVP 到规模化团队协作的连续演进路径

---

## RAG Architecture & Capabilities

为补齐平台的 AI 核心能力，RAG 系统按“查询构建 -> 路由 -> 索引 -> 检索 -> 生成 -> 评估”设计为独立可演进流水线。

### 1. 查询构建 (Query Construction)

- 关系型数据库: 问题 -> 大脑 -> 关系型数据库
- 图数据库: 问题 -> 大脑 -> 图数据库
- 向量数据库: 问题 -> 大脑 -> 向量库

### 2. RAG 类型 (RAG Types)

- 多查询 (Multi Query)
- RAG/RAC 融合 (Fusion)
- 假设文档生成 (HyDE)
- 问题分解 (Decomposition)

### 3. 路由 (Routing)

- 逻辑路由: 选择检索路径（图数据库 / 关系型数据库 / 向量库）
- 语义路由: 选择提示词与策略（Prompt 1 / Prompt 2）

### 4. 索引构建 (Indexing)

- 语义切分 (Semantic Split)
- 多表示索引 (Multi Representation Indexing)
- 文档 -> 摘要 -> 向量库 / 图数据库
- 特殊嵌入 (Special Embeddings，如 ColBERT)
- 层次化索引 (Hierarchical Indexing / RAPTOR)
- 文档 -> 聚类簇 -> 子聚类簇

### 5. 检索 (Retrieval)

- 精修 (Refinement): 文档 -> 大脑 -> 精修后文档
- 重排序 (Reranking): 多份文档按相关性重排

### 6. 生成 (Generation)

- 主动检索 (Active Retrieval)
- Self-RAG、RRR 等可控生成技术
- 流程: 文档库 -> 检索 -> 大脑 -> 答案

### 7. 评估 (Evals)

- 评估指标体系 (Evaluation Metrics)
- ragas
- Grouse
- DeepEval

---

## Target Users

### Primary Users

1. QA 工程师（核心用户）
- 目标：更快生成高质量测试用例，减少重复劳动
- 痛点：手工编写耗时、维护成本高、执行反馈分散
- 成功标准：用更少时间完成更高覆盖的测试设计与执行

2. 测试负责人 / QA Lead
- 目标：提升团队测试效率与质量可视化能力
- 痛点：缺少统一视角评估覆盖、效率和风险
- 成功标准：能基于数据进行优先级管理和质量决策

### Secondary Users

1. 产品经理
- 关注需求是否被完整验证、问题是否闭环

2. 研发负责人 / 技术负责人
- 关注缺陷趋势、回归质量、发布风险控制

3. 项目管理角色
- 关注跨角色协作效率和质量里程碑达成情况

### User Journey

1. 需求输入
- 用户上传/粘贴需求，系统解析关键测试点

2. 用例生成与整理
- AI 生成初稿 -> 人工审校 -> 结构化归档

3. 执行与观察
- 运行测试 -> 记录结果 -> 关联失败上下文

4. 问题处理
- 自动/手动创建 Issue -> 分配处理 -> 验证关闭

5. 持续优化
- 通过指标看板反向优化用例质量与执行策略

---

## Success Metrics

### User Success Metrics

- 测试用例起草效率提升（相对基线显著下降）
- 用例审校通过率提升（一次通过占比提升）
- 测试闭环时长缩短（从需求到问题闭环）
- 用户对 AI 生成内容的采纳率持续提升

### Business Objectives

- 建立团队统一测试流程与数据标准
- 提升关键业务模块质量稳定性
- 支撑更多项目/系统并行测试协作
- 形成可复用的测试资产与知识沉淀体系

### Key Performance Indicators

- AI 生成用例占新增用例比例
- 活跃项目数、活跃用户数、周活跃执行次数
- 执行通过率、失败重开率、缺陷关闭周期
- 需求-测试-执行-问题链路关联完整率
- 人均测试资产产出与维护效率指标

---

## MVP Scope

### Core Features

1. 账号与权限基础能力
- 注册/登录、会话管理、基础角色控制

2. 测试资产核心模型
- Test（CASE/SUITE/FOLDER）、Run、Execution、Issue 基础能力

3. AI 生成最小闭环
- 需求输入 -> 测试点生成 -> 用例生成 -> 资产落库

4. 执行与结果回传
- 创建执行任务、记录执行结果、基础统计展示

5. 问题管理基础
- 与测试/执行对象关联的问题创建与状态流转

6. RAG 引擎 V1（本次补充）
- 查询构建、路由、索引、检索、生成、评估全链路打通
- 支持 Multi Query / HyDE / Decomposition / RAG Fusion / Reranking
- 支持向量库 + 图数据库 + 关系型数据库的混合检索

### Out of Scope for MVP

- 复杂企业级组织治理（多租户高级权限编排）
- 高级 AI 调优控制台与多模型策略编排
- 深度第三方双向同步（如完整 TestRail/Jira 双向映射）
- 大规模性能压测编排与高级可观测分析
- 重型报表定制引擎

### MVP Success Criteria

- 能稳定跑通“需求 -> 用例 -> 执行 -> 问题”闭环
- 核心用户可在真实项目中连续使用并给出正向反馈
- 关键指标可被采集并支持管理层判断价值
- 产品结构可支撑后续功能扩展而无需推倒重构

### Future Vision

- 从“测试管理工具”升级为“质量协同中枢”
- 引入更强的 AI 规划能力（优先级推荐、回归策略建议）
- 建立跨项目知识库与质量模式识别能力
- 支持更完善的企业集成生态与治理能力

---

## Next Recommended Workflow

建议下一步进入：
1. `CP`（Create PRD）将 Brief 细化为可执行产品需求
2. `CU`（Create UX）补齐关键用户旅程与交互方案
3. `CA`（Create Architecture）固化技术决策与边界
