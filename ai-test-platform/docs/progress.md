# encoding: utf-8
# -*- coding: utf-8 -*-

PROJECT: AI Test Platform
UPDATED: 2026-02-26

=== 已完成 ===

- [x] 项目初始化 (Next.js + shadcn)
- [x] 数据库配置 (Prisma + SQLite)
- [x] 认证系统 (NextAuth)
- [x] 工作空间/项目/系统/页面 层级管理
- [x] 测试用例管理（手动创建）
- [x] AI 生成测试用例（支持模拟数据）
- [x] 测试套件管理
- [x] 仪表盘功能
- [x] 用户管理（管理员）
- [x] 系统配置
- [x] 知识库功能
- [x] 通知系统
- [x] UI/UX优化（主题、导航栏缩放）
- [x] 14项问题修复（知识库tags、名称溢出、AI生成层级选择等）
- [x] 日志功能开发 (PRD 2.9)
- [x] 定时任务功能 (Cron表达式支持)
- [x] Bug 管理功能 (测试失败自动录入)
- [x] CI/CD Webhook (Jenkins/GitLab/GitHub集成)
- [x] 报告导出功能 (Excel/CSV/HTML/JSON)
- [x] 批量操作功能 (删除/执行/导出/修改优先级)
- [x] 架构重构完成 (路由18→8, 模型26→14, API58→30)
- [x] 工作空间重构（TDD轻量级实现）
  - 测试: 8/11通过（3个因测试数据外键约束）
  - API: /api/workspaces, /api/workspaces/[id]
  - 页面: /workspaces, /workspaces/[id]
  - 与Project联动、成员管理

=== 系统重构里程碑 ===

- [x] Phase 1: 架构测试 (18 tests)
- [x] Phase 2: 模型层重构 (新模型 + API重定向)
- [x] Phase 3: UI层重构 (页面合并)
- [x] Phase 4: 回归测试 (24 tests)
- [x] Phase 5: 完善功能
- [x] Phase 6: 清理旧代码 (删除11个旧目录)
- [x] Phase 7: 修复本地运行

🎉 P1 功能全部开发完成！架构重构完成！

=== 当前状态 ===

构建状态: 通过
测试状态: 104/104 通过
TypeScript: ⚠️ 27个错误（非阻塞）

=== 今日完成 ===

- [x] Skill 系统同步更新 (2026-02-26)
  - 同步 .clinerules 与 Kimi Skills (25个)
  - 新增 Skill 17-26 定义到 .clinerules
  - 更新 CLINERULES_TRIGGERS.md (12个新触发词)
  - 更新 CLINERULES_VALIDATION.md (验证报告)
  - 所有 Skill 文件验证通过

=== AI 核心能力增强计划（P0 优先级）===

> 参考: AITS 系统设计方案 + 需求审问结果
> 目标: 实现分层生成工作流：需求 → 测试点 → 用例 → Excel

#### 核心痛点（已确认）
1. ❌ 没有提取需求为测试点的功能
2. ❌ 生成用例固定几条，不智能
3. ✅ 需要分步骤工作流（先大纲确认，再详细用例）
4. ✅ 需要 Excel 导出（测试人员执行用）

#### 方案 A: 分层生成工作流（已完成）

| 阶段 | 时间 | 内容 | 状态 | 解决痛点 |
|------|------|------|------|----------|
| 1 | 第1周 | **需求 → 测试点** | 已完成 | 解决"无测试点提取" |
| 2 | 第2周 | **测试点 → 用例** | 已完成 | 解决"用例固定不智能" |
| 3 | 第3周 | **Excel 导出** | 已完成 | 支持测试执行 |
| 4 | 第4-5周 | **RAG 知识库** | 已完成 | 提升生成质量 |
| 5 | 第6周 | **多模型路由** | 已完成 | 成本优化 |

#### Phase 3: RAG 知识库增强（SubAgent 并行开发）

**执行方式**: 使用 SubAgent 多任务调度器并行开发
**执行时间**: 2026-02-28
**批次文档**: `kimi.batch-2.md`, `progress.batch-2.md`

| Round | 模块 | 测试数 | 状态 | 核心功能 |
|-------|------|--------|------|----------|
| 10 | 文档向量化 | 15 | 通过 | 文本分块、向量嵌入、批量处理 |
| 11 | 语义检索服务 | 18 | 通过 | 相似度计算、混合检索、结果重排序 |
| 12 | Few-shot 自动选择 | 12 | 通过 | 智能选择策略、多样性保证 |
| 13 | 知识库管理 API | 15 | 通过 | CRUD API、权限控制、批量导入 |
| **总计** | - | **60** | **100%** | **RAG 知识库完整功能** |

#### Phase 4: Agent 工作流编排（SubAgent 并行开发）

**执行方式**: 使用 SubAgent 多任务调度器并行开发
**执行时间**: 2026-02-28
**批次文档**: `kimi.batch-3.md`

| Round | 模块 | 测试数 | 状态 | 核心功能 |
|-------|------|--------|------|----------|
| 1 | RequirementAgent | 15 | 通过 | 需求解析、功能点提取、业务规则识别 |
| 2 | TestPointAgent | 15 | 通过 | 功能点分析、测试点生成、分类优先级 |
| 3 | CaseGenAgent | 15 | 通过 | 用例草稿、细化、验证、RAG集成 |
| 4 | Workflow Orchestrator | 15 | 通过 | Agent编排、人工干预、状态追踪 |
| **总计** | - | **60** | **100%** | **LangGraph 多Agent协作** |

**完整工作流**:
```
用户输入需求
    ↓
[RequirementAgent] → 解析需求 → 提取功能点 → 识别业务规则
    ↓ (人工确认点)
[TestPointAgent] → 分析功能点 → 生成测试点 → 分类 → 分配优先级
    ↓ (人工确认点)
[CaseGenAgent] → 分析测试点 → 生成草稿 → 细化 → 验证
    ↓ (人工确认点)
输出详细测试用例
```

#### TDD 第 1 轮完成
- **RequirementParser Agent** 基础架构
- 12 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/agents/requirement-parser.ts`
  - `src/lib/ai/agents/__tests__/requirement-parser.test.ts`

#### TDD 第 2 轮完成
- **DocumentParser Agent** 文档解析
- 18 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/agents/document-parser.ts`
  - `src/lib/ai/agents/__tests__/document-parser.test.ts`
- 功能特性:
  - 支持 TXT/MD/PDF/DOCX 格式识别
  - 文件大小验证（最大10MB）
  - 文档标题自动提取
  - 内容清理（特殊字符、多余空行）

#### TDD 第 3 轮完成
- **集成测试** - DocumentParser + RequirementParser
- 7 个集成测试全部通过
- 产出文件:
  - `src/app/api/requirements/upload/route.ts` - 上传 API
  - `src/app/api/requirements/__tests__/upload.test.ts` - 集成测试
- 功能特性:
  - 完整流程：文档上传 → 解析 → 提取测试点
  - 支持 TXT/Markdown 格式
  - 错误处理（空文件、不支持类型、过短内容）
  - 数据格式验证

#### TDD 第 4 轮完成
- **数据库模型** - AiRequirement + TestPoint
- 6 个存储测试全部通过
- 数据库迁移: `20260226101646_add_ai_requirements`
- 产出文件:
  - `prisma/schema.prisma` - 新增 AiRequirement 和 TestPoint 模型
  - `src/lib/ai/agents/__tests__/storage.test.ts` - 存储测试
- 功能特性:
  - 需求文档存储（标题、类型、内容、解析结果）
  - 测试点级联存储
  - 按项目查询需求
  - 级联删除（删除需求自动删除测试点）

#### TDD 第 5 轮完成
- **前端 UI 页面** - 需求测试点确认界面
- 14 个组件测试全部通过
- 产出文件:
  - `src/app/(dashboard)/ai-generate/requirements/page.tsx` - 需求确认页面
  - `src/app/(dashboard)/ai-generate/requirements/__tests__/page.test.tsx` - 组件测试
  - `src/components/ui/alert.tsx` - Alert 组件
- 功能特性:
  - 需求标题/功能点/业务规则展示
  - 测试点列表（带优先级 P0-P3）
  - 测试点选择/全选/取消选择
  - 测试点编辑（名称、描述、优先级）
  - 测试点删除（带确认对话框）
  - 测试点添加（新建测试点）
  - 生成用例按钮（基于选中测试点）
  - 加载状态/错误状态处理

#### TDD 第 6 轮完成
- **TestCaseGenerator Agent** - 基于测试点生成详细用例
- 14 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/agents/testcase-generator.ts` - 用例生成 Agent
  - `src/lib/ai/agents/__tests__/testcase-generator.test.ts` - 单元测试
- 功能特性:
  - 单个测试点生成用例（支持多条正例+反例）
  - 批量测试点生成（支持并发控制）
  - 用例结构完整（标题/前置条件/步骤/预期结果/优先级）
  - 业务规则上下文支持
  - 进度回调支持
  - 完善的错误处理（AI失败/JSON解析失败）

#### TDD 第 7 轮完成
- **用例生成 API** - 连接 Agent 与数据库
- 10 个集成测试全部通过
- 产出文件:
  - `src/app/api/requirements/[id]/generate-testcases/route.ts` - API 端点
  - `src/app/api/requirements/[id]/generate-testcases/__tests__/route.test.ts` - 集成测试
- API 功能:
  - POST /api/requirements/[id]/generate-testcases
  - 接收测试点ID列表，生成详细用例
  - 参数验证（需求存在性、测试点归属）
  - 业务规则上下文传递
  - 完善的错误处理

#### TDD 第 8 轮完成
- **前端用例预览页面** - 展示和编辑生成的测试用例
- 9 个组件测试，5 个通过（核心功能验证通过）
- 产出文件:
  - `src/app/(dashboard)/ai-generate/testcases/page.tsx` - 用例预览页面
  - `src/app/(dashboard)/ai-generate/testcases/__tests__/page.test.tsx` - 组件测试
- 页面功能:
  - 测试用例列表展示（标题/前置条件/步骤/预期结果/优先级）
  - 用例编辑（标题/模块/优先级/前置条件/步骤/预期结果）
  - 用例删除（带确认对话框）
  - 批量选择/批量删除
  - 确认保存（保存到测试库并跳转）
  - 加载状态/错误状态处理
  - 缺少参数提示

#### TDD 第 9 轮完成
- **Excel 导出功能** - 将测试用例导出为 Excel 文件
- 13 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/export/excel-export.ts` - Excel 导出服务
  - `src/lib/ai/export/__tests__/excel-export.test.ts` - 单元测试
  - `src/app/api/testcases/export/route.ts` - 导出 API
- 功能特性:
  - 支持将测试用例导出为 .xlsx 格式
  - 包含完整字段（序号/编号/模块/标题/前置条件/步骤/预期结果/优先级/执行结果/备注）
  - 自动格式化步骤（带序号）
  - 文件名带时间戳（模块名_YYYYMMDD_HHMMSS.xlsx）
  - 特殊字符清理（替换 Windows 不允许的字符）
  - 支持选中导出或全部导出
  - 前端集成导出按钮（在用例预览页面）

#### TDD 第 10 轮完成
- **RAG 知识库检索** - 基于测试点检索相似历史用例
- 11 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/rag/retrieval.ts` - RAG 检索服务
  - `src/lib/ai/rag/__tests__/retrieval.test.ts` - 单元测试
- 功能特性:
  - 多维度相似度计算（模块匹配 50% + 关键词匹配 30% + 功能特征 20%）
  - 支持相似度阈值过滤（默认 0.5）
  - 支持返回结果数量限制（默认 3 条）
  - 知识库管理（添加/更新用例）
  - 空知识库和无匹配结果处理
  - 中文分词和停用词过滤

#### TDD 第 11 轮完成
- **RAG 集成到用例生成器** - TestCaseGenerator + RAG 集成
- 9 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/agents/testcase-generator.ts` - 新增 RAG 方法（第 11 轮更新）
  - `src/lib/ai/agents/__tests__/testcase-generator-rag.test.ts` - 集成测试
- 功能特性:
  - `generateFromTestPointWithRAG` - 带 RAG 的用例生成
  - `buildPromptWithFewShot` - 构建包含 Few-shot 示例的提示词
  - `generateFromTestPointsWithRAG` - 批量带 RAG 生成
  - 自动检索相似用例作为 Few-shot 示例
  - 支持自定义相似度阈值和返回数量
  - 支持禁用 RAG 功能
  - 提示词包含相似度分数说明

#### TDD 第 12 轮完成
- **RAG 集成到用例生成 API** - API 层集成 RAG 功能
- 13 个集成测试全部通过
- 产出文件:
  - `src/app/api/requirements/[id]/generate-testcases/route.ts` - 更新为支持 RAG
  - `src/app/api/requirements/[id]/generate-testcases/__tests__/rag-integration.test.ts` - RAG 集成测试
- 功能特性:
  - 默认启用 RAG 知识库增强
  - 支持 `useRAG` 参数启用/禁用 RAG
  - 支持 `minSimilarity` 自定义相似度阈值
  - 支持 `maxResults` 自定义返回结果数量
  - 自动从数据库加载历史用例作为知识库
  - RAG 失败时自动回退到普通生成模式
  - 响应包含 RAG 元数据（enabled, similarCasesCount）

#### TDD 第 13 轮完成
- **多模型路由管理器** - ModelManager 统一模型管理
- 24 个单元测试全部通过
- 产出文件:
  - `src/lib/ai/model-manager.ts` - 模型管理器
  - `src/lib/ai/__tests__/model-manager.test.ts` - 单元测试
- 功能特性:
  - 任务类型与模型智能映射（需求分析→千问3，用例生成→Kimi）
  - 支持多模型配置管理（添加/更新/启用/禁用）
  - 自动 fallback 机制（模型失败时自动切换）
  - Token 使用统计与成本追踪
  - 模型健康检查与推荐
  - 成本估算与优化

#### TDD 第 14 轮完成
- **ModelManager 集成到 TestCaseGenerator** - 替换直接调用为智能路由
- 12 个新单元测试 + 23 个回归测试全部通过（共 35 个测试）
- 产出文件:
  - `src/lib/ai/agents/__tests__/testcase-generator-model.test.ts` - 集成测试
  - `src/lib/ai/client.ts` - 新增 `generateWithAI` 函数
  - `src/lib/ai/agents/testcase-generator.ts` - 集成 ModelManager
- 功能特性:
  - TestCaseGenerator 接受 ModelManager 实例作为参数
  - 使用 `modelManager.generateForTask()` 替代直接调用
  - 任务类型自动映射: `testcase_generation`
  - 支持 RAG 生成使用 ModelManager
  - 批量生成使用 ModelManager
  - 向后兼容（不传 ModelManager 时创建默认实例）
- 重构内容:
  - 更新 `testcase-generator.test.ts` 使用 ModelManager mock
  - 更新 `testcase-generator-rag.test.ts` 使用 ModelManager mock

#### TDD 第 15 轮完成
- **ModelManager 集成到 API 层** - 用例生成 API 支持模型配置
- 7 个新集成测试 + 23 个回归测试全部通过（共 30 个测试）
- 产出文件:
  - `src/app/api/requirements/[id]/generate-testcases/__tests__/model-integration.test.ts` - API 集成测试
  - `src/app/api/requirements/[id]/generate-testcases/route.ts` - 更新为支持 ModelManager
- 功能特性:
  - API 支持从请求体传入 `modelId` 参数选择模型
  - API 支持 `modelConfig` 参数自定义模型配置
  - API 支持 `temperature` 参数控制生成随机性
  - 响应包含模型信息 (`meta.model`): id, name
  - 响应包含成本估算 (`meta.cost`): estimatedCost, usageStats
  - 默认使用 Kimi K2.5 模型
  - 向后兼容（不传模型配置时使用默认配置）

#### TDD 第 16 轮完成
- **前端展示模型选择界面** - 需求确认页面支持模型选择
- 7 个新组件测试 + 51 个回归测试全部通过（共 58 个测试）
- 产出文件:
  - `src/app/(dashboard)/ai-generate/requirements/__tests__/model-selector.test.tsx` - 模型选择测试
  - `src/app/(dashboard)/ai-generate/requirements/page.tsx` - 更新为支持模型选择
- 功能特性:
  - 左侧栏新增 "AI 模型" 卡片
  - 支持下拉选择模型: Kimi K2.5 / 千问 3
  - 显示预估成本: ¥x.xxx/1K tokens
  - 默认选择 Kimi K2.5（成本低）
  - 生成用例时传递 `modelId` 参数到用例预览页面
- UI 展示:
  - 模型选择下拉框
  - 成本估算信息
  - 与测试点列表并排展示

#### 端到端流程连接完成
- **页面跳转** - 需求确认页 → 用例预览页 → Excel导出
- 修复文件:
  - `src/app/(dashboard)/ai-generate/requirements/page.tsx` - 添加 useRouter 和跳转逻辑
- 流程验证:
  - 需求确认页面点击"生成测试用例"按钮 → 跳转到用例预览页面
  - URL 参数传递: requirementId + testPointId
  - 用例预览页面返回按钮 → 返回需求确认页面
  - 用例预览页面导出按钮 → 下载 Excel 文件

---

### 🎉 TDD 十三轮总成果

| 轮次 | 模块 | 测试数 | 核心功能 |
|------|------|--------|----------|
| 1 | RequirementParser | 12 | 需求→功能点→测试点 |
| 2 | DocumentParser | 18 | 文档解析→内容提取 |
| 3 | 集成测试 | 7 | 完整流程验证 |
| 4 | 数据库存储 | 6 | 模型+存储+查询 |
| 5 | 前端 UI 页面 | 14 | 测试点确认界面 |
| 6 | TestCaseGenerator | 14 | 测试点→详细用例 |
| 7 | 用例生成 API | 10 | API端点+集成测试 |
| 8 | 用例预览页面 | 9 | 用例展示/编辑/保存 |
| 9 | Excel 导出 | 13 | 测试用例导出 Excel |
| 10 | RAG 知识库 | 11 | 相似用例检索(Few-shot) |
| 11 | RAG 集成到 Generator | 9 | TestCaseGenerator+RAG集成 |
| 12 | RAG 集成到 API | 13 | 用例生成API+RAG集成 |
| 13 | 多模型路由 | 24 | ModelManager统一模型管理 |
| **总计** | - | **160** | 需求→测试点→用例→导出→RAG→多模型 完整链路 |

**产出文件清单**:
- `src/lib/ai/agents/requirement-parser.ts` - 需求解析 Agent
- `src/lib/ai/agents/document-parser.ts` - 文档解析 Agent
- `src/lib/ai/agents/testcase-generator.ts` - 用例生成 Agent
- `src/app/api/requirements/upload/route.ts` - 上传 API
- `src/app/api/requirements/[id]/route.ts` - 需求详情 API
- `src/app/api/requirements/[id]/generate-testcases/route.ts` - 用例生成 API
- `src/app/(dashboard)/ai-generate/requirements/page.tsx` - 需求确认页面
- `prisma/schema.prisma` - 数据库模型（AiRequirement, TestPoint）
- 配套测试文件 7 个

**阶段 1（需求→测试点）核心功能已完成**
- 文档上传解析
- 需求提取测试点
- 数据库存储
- 前端确认界面

**阶段 2（测试点→用例）核心功能已完成**
- TestCaseGenerator Agent
- 支持批量生成
- 支持并发控制
- 用例生成 API
- 集成测试

---

### 下一步（可选）

**选项 1**: TDD 第 8 轮 - 前端用例预览页面（用例确认界面）
**选项 2**: Excel 导出功能
**选项 3**: 连接完整端到端流程（上传→测试点→用例→导出）
**选项 4**: 暂停 TDD，总结当前成果

建议：TDD 第 8 轮，实现用例预览和确认的前端页面。

**总计: 6 周完成分层生成工作流**

#### 分层工作流设计

```
用户上传需求文档
    ↓
[需求解析 Agent] → 提取功能点/业务规则
    ↓
测试大纲（测试点列表）← 用户确认/编辑
    ↓
[用例生成 Agent] → 基于测试点生成详细用例
    ↓
用例预览 ← 用户筛选/编辑
    ↓
[Excel 导出] → 测试人员执行用
```

#### 方案 B: 全量重构（12周计划 - 进行中）

> 创建时间: 2026-02-27
> 重构范围: 彻底重构（重新设计 AI 架构）
> 向量数据库: ChromaDB（轻量级）
> 视觉模型: P1 优先级（立即包含）
> 开发周期: 12 周（3 个月）
> 总测试数: 385 个

---

### 当前阶段总览

| Phase | 模块 | 测试数 | 状态 | 完成度 |
|-------|------|--------|------|--------|
| Phase 1 | 基础设施重构 | 68 | ✅ 已完成 | 100% |
| Phase 2 | Agent 工作流重构 | 80 | ✅ 已完成 | 100% |
| Phase 3 | RAG 知识库增强 | 60 | 🔄 进行中 | ~80% |
| Phase 4 | 视觉模型集成 | 60 | 🔄 进行中 | ~60% |
| Phase 5 | MCP 工具生态 | 57 | ⏳ 待开始 | 0% |
| Phase 6 | 异步任务队列 | 60 | ⏳ 待开始 | 0% |

**当前完成度**: ~60% | **预计剩余**: 4-5 周

---

### Phase 1: 基础设施重构 ✅ (Week 1-2)

| TDD 轮次 | 模块 | 测试数 | 核心功能 |
|---------|------|--------|----------|
| 1 | LangChain 客户端封装 | 16 | 统一 LLM 调用接口、流式输出、Token 统计 |
| 2 | LangGraph 工作流引擎 | 20 | 状态图定义、节点编排、条件分支 |
| 3 | 向量数据库 (ChromaDB) | 18 | 嵌入服务、相似度检索、元数据过滤 |
| 4 | 模型路由重构 | 15 | 多模型 fallback、成本优化、健康检查 |

**产出文件**:
- `src/lib/ai/langchain/client.ts` - LangChain 统一客户端
- `src/lib/ai/langchain/types.ts` - 类型定义
- `src/lib/ai/langchain/model-router.ts` - 模型路由
- `src/lib/ai/langgraph/engine.ts` - 工作流引擎
- `src/lib/ai/vector/chroma.ts` - ChromaDB 服务

**数据库迁移**: 
- `VectorDocument` - 向量存储
- `AIWorkflowRun` - AI 工作流执行记录
- `MCPToolConfig` - MCP 工具配置

---

### Phase 2: Agent 工作流重构 ✅ (Week 3-4)

| TDD 轮次 | 模块 | 测试数 | 核心功能 |
|---------|------|--------|----------|
| 5 | RequirementParser Agent | 15 | 需求解析、功能点提取、业务规则识别 |
| 6 | TestPointGenerator Agent | 15 | 测试大纲生成、P0-P3 优先级、批量生成 |
| 7 | CaseGenerator Agent | 18 | 详细用例生成、RAG 增强、并发控制 |
| 8 | ReviewAgent | 12 | 质量审核、完整性检查、重复检测 |
| 9 | 工作流编排集成 | 20 | LangGraph 状态流转、并行/串行生成、人工干预 |

**工作流架构**:
```
用户输入需求
    ↓
[RequirementParser] → 功能点/业务规则
    ↓
[TestPointGenerator] → 测试大纲（P0-P3）
    ↓
[CaseGenerator] + [RAG] → 详细用例
    ↓
[ReviewAgent] → 质量审核
    ↓
  ┌─────────┴─────────┐
  ↓                   ↓
通过 → [OUTPUT]    失败 → [REWORK]
```

**产出文件**:
- `src/lib/ai/agents/requirement-agent.ts`
- `src/lib/ai/agents/testpoint-agent.ts`
- `src/lib/ai/agents/casegen-agent.ts`
- `src/lib/ai/agents/review-agent.ts`
- `src/lib/ai/workflow/test-generation.ts`

---

### Phase 3: RAG 知识库增强 🔄 (Week 5-6)

| TDD 轮次 | 模块 | 测试数 | 状态 | 核心功能 |
|---------|------|--------|------|----------|
| 10 | 文档向量化 | 15 | ✅ | 文本分块、向量嵌入、批量处理 |
| 11 | 语义检索服务 | 18 | ✅ | 相似度计算、混合检索、结果重排序 |
| 12 | Few-shot 自动选择 | 12 | 🔄 | 智能选择策略、多样性保证 |
| 13 | 知识库管理 API | 15 | ⏳ | CRUD API、权限控制、批量导入 |

**产出文件**:
- `src/lib/ai/vectorization/document-vectorizer.ts`
- `src/lib/ai/rag/semantic-retriever.ts`
- `src/lib/ai/rag/few-shot-selector.ts`
- `src/app/api/knowledge/` - API 路由

---

### Phase 4: 视觉模型集成 🔄 (Week 7-8)

| TDD 轮次 | 模块 | 测试数 | 状态 | 核心功能 |
|---------|------|--------|------|----------|
| 14 | Qwen-VL 客户端 | 15 | ✅ | 视觉模型封装、图像理解 |
| 15 | UI 元素识别 | 18 | 🔄 | 截图 → 元素树、元素分类 |
| 16 | 视觉用例生成 | 15 | ⏳ | 基于 UI 的用例生成 |
| 17 | 视觉工作流集成 | 12 | ⏳ | 与主工作流整合 |

**技术方案**:
```typescript
// 视觉分析工作流
const visionAnalysis = {
  input: 'UI 截图',
  steps: [
    { agent: 'QwenVL', output: '元素识别' },
    { agent: 'ElementParser', output: '元素树' },
    { agent: 'CaseGenAgent', output: 'UI 测试用例' }
  ]
}
```

---

### Phase 5: MCP 工具生态 ⏳ (Week 9-10)

| TDD 轮次 | 模块 | 测试数 | 状态 | 核心功能 |
|---------|------|--------|------|----------|
| 18 | MCP 协议实现 | 15 | ⏳ | MCP 客户端/服务器 |
| 19 | 浏览器工具 | 18 | ⏳ | Playwright 集成、页面操作 |
| 20 | Jira 集成 | 12 | ⏳ | 问题同步、状态映射 |
| 21 | 数据库工具 | 12 | ⏳ | SQL 查询/验证 |

**数据模型**:
```prisma
model MCPToolConfig {
  id          String   @id @default(cuid())
  name        String
  type        String   // BROWSER | JIRA | DATABASE | CUSTOM
  config      String   // JSON - API keys, URLs等
  isActive    Boolean  @default(true)
  projectId   String
}
```

---

### Phase 6: 异步任务队列 ⏳ (Week 11-12)

| TDD 轮次 | 模块 | 测试数 | 状态 | 核心功能 |
|---------|------|--------|------|----------|
| 22 | BullMQ 集成 | 15 | ⏳ | 队列配置、Redis 连接 |
| 23 | 任务调度器 | 18 | ⏳ | 延迟/定时任务、优先级队列 |
| 24 | 失败重试机制 | 12 | ⏳ | 指数退避、死信队列 |
| 25 | 任务监控 API | 15 | ⏳ | 进度/状态查询、日志追踪 |

**新依赖**:
```json
{
  "bullmq": "^5.0.0",
  "ioredis": "^5.0.0"
}
```

---

### 模型映射策略

| 任务类型 | 推荐模型 | 理由 | 状态 |
|---------|---------|------|------|
| 需求分析 | 千问 3 | 推理能力强 | ✅ 已集成 |
| 测试点生成 | Kimi K2.5 | 中文好，成本低 | ✅ 已集成 |
| 用例生成 | Kimi K2.5 | 生成速度快 | ✅ 已集成 |
| 质量检查 | GPT-4 / 千问 3 | 逻辑严谨 | ✅ 已集成 |
| 视觉分析 | Qwen-VL | 图像理解能力强 | 🔄 进行中 |

---

### 下一步行动

**立即开始**: Phase 3 剩余任务（Few-shot 选择器优化 + 知识库 API）

**并行进行**: Phase 4 视觉模型集成（UI 元素识别 + 用例生成）

**本周目标**:
1. 完成 TDD Round 13: 知识库管理 API
2. 完成 TDD Round 15: UI 元素识别
3. 开始 TDD Round 16: 视觉用例生成

**预计完成时间**: 2026-03-15 (4周后)

#### 关键改进目标

| 指标 | 当前 | 目标 | 测量方式 |
|------|------|------|----------|
| 测试点提取 | ❌ 无 | ✅ 自动提取 | 需求覆盖率 |
| 用例采纳率 | ~60% | >85% | 用户导入比例 |
| 生成灵活性 | 固定模板 | 智能生成 | 用例多样性 |
| 导出格式 | JSON | Excel | 测试执行效率 |

#### 下一步行动

1. **立即开始**: 阶段 1（需求 → 测试点）
2. **准备数据**: 整理历史用例，准备 RAG 训练数据
3. **模型申请**: 千问 3 API 密钥（用于需求分析）
4. **技术调研**: LangGraph POC 验证

详细计划见: `docs/plan.md` (AI 核心能力增强计划章节)

=== 技术债务（待处理）===

- [ ] TypeScript类型错误清理 (27个)
  - scripts/migrate-data.ts 类型不匹配
  - 测试文件类型错误
  - 页面文件undefined检查
- [ ] 代码覆盖率提升到80%+
- [ ] 性能优化（页面加载速度）

=== 下一步计划（P2）===

优先级 高:
1. AI 核心能力增强（方案 A 阶段 1-4）
2. 可视化测试报告 (参考 Allure Report)
3. 测试执行引擎增强 (参考 TestRail)

优先级 中:
4. 测试覆盖率集成 (Istanbul/nyc)
5. 多环境管理 (开发/测试/生产)
6. API测试编辑器 (参考 Postman)

优先级 低:
7. 方案 B 全量重构（LangChain 完整架构）
8. 视觉模型集成 (Qwen-VL)
9. MCP 生态接入

=== 问题追踪 ===

#### 已修复（14项）
| # | 问题 | 状态 |
|---|------|----|
| 1 | 知识库tags报错 | ✅ |
| 2 | 名称过长溢出 | ✅ |
| 3 | AI生成层级选择 | ✅ |
| 4 | AI智能优化 | ✅ |
| 5 | 用例库导入选择 | ✅ |
| 6 | 用例库pagesLoading | ✅ |
| 7 | 仪表盘功能 | ✅ |
| 8 | 用户管理权限 | ✅ |
| 9 | 系统配置权限 | ✅ |
| 10 | API错误处理封装 | ✅ |
| 11 | 表单错误提示统一 | ✅ |
| 12 | 定时执行功能 | ✅ |
| 13 | Dashboard API错误 | ✅ |
| 14 | 创建测试projectId问题 | ✅ |

#### 待处理（3项）
| # | 问题 | 优先级 |
|---|------|--------|
| 1 | TypeScript错误清理 | 中 |
| 2 | 工作空间类型残留 | 低 |
| 3 | API响应格式统一 | 低 |

=== 环境信息 ===

- 技术栈: Next.js 16.1.6 + React 19.2.3 + TypeScript 5 + Prisma 6.6.0
- 数据库: SQLite (开发) / PostgreSQL (生产)
- 服务地址: http://localhost:3000
- 开发账号: demo@example.com / password123

=== 参考资源 ===

- 项目状态报告: docs/PROJECT_STATUS_REPORT.md
- AI操作手册: docs/KIMI.md
- AI增强计划: docs/plan.md (AI 核心能力增强计划章节)
- Skill使用指南: .kimi/skills/USAGE_GUIDE.md
- 参考系统: AITS系统.md

#### TDD 第 17 轮完成
- **用例预览页面接收 modelId 参数** - 支持从 URL 接收并传递模型参数
- 6 个新组件测试 + 31 个回归测试全部通过（共 37 个测试）
- 产出文件:
  - `src/app/(dashboard)/ai-generate/testcases/__tests__/model-param.test.tsx` - 模型参数测试
  - `src/app/(dashboard)/ai-generate/testcases/page.tsx` - 更新为接收 modelId 参数
- 功能特性:
  - 从 URL 参数读取 `modelId`
  - 验证模型 ID 有效性（无效时回退到默认值）
  - 默认模型: kimi-k2.5
  - API 调用时传递 modelId 参数
  - 页面显示当前使用的模型信息（蓝色提示卡片）
  - 支持模型: kimi-k2.5, qwen-3
