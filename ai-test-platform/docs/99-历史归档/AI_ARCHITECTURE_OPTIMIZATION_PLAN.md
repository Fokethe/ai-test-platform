# encoding: utf-8
# -*- coding: utf-8 -*-

# AI架构深度优化执行计划 (AI Architecture Optimization Plan)

> **版本**: v1.0  
> **创建日期**: 2026-03-09  
> **执行模式**: Subagent TDD  
> **总工期**: 9周 (5个Phase)  
> **作者**: AI Team

---

## 📋 目录

1. [执行摘要](#1-执行摘要)
2. [现状分析](#2-现状分析)
3. [优化方案详解](#3-优化方案详解)
4. [实施路线图](#4-实施路线图)
5. [Subagent TDD执行规范](#5-subagent-tdd执行规范)
6. [技术规范](#6-技术规范)
7. [风险与应对](#7-风险与应对)
8. [附录](#8-附录)

---

## 1. 执行摘要

### 1.1 优化目标

| 维度 | 当前值 | 目标值 | 提升幅度 | 优先级 |
|------|--------|--------|----------|--------|
| **需求解析准确率** | 60% | 90% | +50% | P0 |
| **用例生成准确率** | 70% | 92% | +31% | P0 |
| **RAG召回率** | 60% | 85% | +42% | P0 |
| **平均响应时间** | 8s | 4s | -50% | P1 |
| **Token成本** | $1.0 | $0.4 | -60% | P1 |
| **用户满意度** | 3.5/5 | 4.5/5 | +29% | P2 |

### 1.2 技术选型

```yaml
# 优化后技术栈
llm:
  primary: kimik2.5              # 主力生成模型
  fallback: qwen3-32b           # 降级备选
  backup: qwen3-72b             # 复杂任务

embedding:
  type: local                   # 本地部署
  model: bge-m3                 # 免费开源
  dimensions: 1024
  device: cuda                  # GPU加速

vector_store:
  primary: chromadb            # 本地向量库
  backup: pgvector             # PostgreSQL扩展

orchestration:
  framework: langgraph         # 工作流编排
  version: ^0.2.0

cache:
  semantic: redis              # 语义缓存
  response: memory             # 响应缓存
```

### 1.3 实施策略

- **执行模式**: Subagent TDD (25个Batch)
- **分批策略**: 每Phase 5个Batch，每个Batch 1-3天
- **验收标准**: 每个Batch必须有测试覆盖>80%，通过TDD验证
- **回滚策略**: 每个Phase独立，失败可回滚到上一稳定版本

### 1.4 预期收益

**业务价值**:
- 测试用例生成质量提升50%，减少人工审核工作量
- AI生成可用率从60%提升至90%，直接可用用例增加50%
- 响应速度提升50%，用户体验显著改善
- 成本降低60%，月节省API费用约¥3000-5000

**技术价值**:
- 架构现代化，引入LangGraph工作流编排
- 本地化部署，数据安全性和隐私保护
- 可观测性增强，全链路监控和追踪
- 技术债务清理，代码健康度提升至90+

---

## 2. 现状分析

### 2.1 当前架构痛点

#### 2.1.1 需求解析层

```
┌─────────────────────────────────────────────────────────────┐
│ 当前实现: RequirementParser (基于规则)                       │
│                                                              │
│ 问题1: 正则匹配无法处理复杂语义                               │
│   - 只能提取"支持XXX"、"可以XXX"等简单模式                   │
│   - 无法理解"当...时，系统应该..."等条件语句                  │
│   - 准确率: 60%                                              │
│                                                              │
│ 问题2: 无上下文理解                                          │
│   - 无法识别需求间的依赖关系                                  │
│   - 无法处理指代消解（如"该功能"指代前文）                    │
│   - 导致功能点遗漏                                           │
│                                                              │
│ 问题3: 无验证机制                                            │
│   - 提取后无自检                                             │
│   - 错误无法发现和修正                                        │
│   - 低质量输出直接传递给下游                                  │
└─────────────────────────────────────────────────────────────┘
```

**代码示例** (当前问题):
```typescript
// 当前: 简单正则提取
private extractFeatures(text: string): string[] {
  // 只能匹配简单模式
  if (line.includes('支持') || line.includes('可以')) {
    features.push(featureMatch[1].trim());
  }
  // 无法处理: "当用户输入错误密码3次时，账户应该被锁定15分钟"
}
```

#### 2.1.2 用例生成层

```
┌─────────────────────────────────────────────────────────────┐
│ 当前实现: TestCaseGenerator (单轮生成)                       │
│                                                              │
│ 问题1: 单轮生成缺乏推理过程                                   │
│   - 直接根据测试点生成用例                                    │
│   - 无逻辑分析和规划步骤                                      │
│   - 生成用例质量不稳定 (70%准确率)                           │
│                                                              │
│ 问题2: 无Self-Reflection                                      │
│   - 生成后不自检                                             │
│   - 错误用例直接入库                                         │
│   - 人工审核工作量大                                         │
│                                                              │
│ 问题3: RAG增强不足                                           │
│   - 仅简单拼接相似用例作为Few-shot                           │
│   - 无动态示例选择                                           │
│   - 示例质量不稳定                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.3 RAG检索层

```
┌─────────────────────────────────────────────────────────────┐
│ 当前实现: 基础向量检索                                        │
│                                                              │
│ 问题1: 检索效率低                                            │
│   - 暴力搜索 O(n) 复杂度                                     │
│   - 1000条用例需要100-200ms                                  │
│   - 无法支撑大规模知识库                                      │
│                                                              │
│ 问题2: 无缓存机制                                            │
│   - 每次查询重新计算embedding                                │
│   - Token浪费严重                                            │
│   - 响应延迟高                                               │
│                                                              │
│ 问题3: 召回率低                                              │
│   - 仅依赖向量相似度                                         │
│   - 无多路召回                                               │
│   - 相关用例遗漏                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 与行业最佳实践差距

| 能力 | 当前 | 行业最佳 | 差距 |
|------|------|----------|------|
| **需求解析** | 规则匹配 | LLM+CoT | 2代差距 |
| **用例生成** | 单轮生成 | ReAct+Self-Reflection | 2代差距 |
| **RAG架构** | 基础检索 | 分层RAG+缓存 | 1代差距 |
| **工作流** | 独立Agents | LangGraph编排 | 1代差距 |
| **成本控制** | 无优化 | 智能路由+缓存 | 1代差距 |

### 2.3 技术债务清单

| 债务项 | 严重程度 | 影响 | 解决Phase |
|--------|----------|------|-----------|
| 无LLM推理的需求解析 | 🔴高 | 准确率60% | Phase 3 |
| 单轮用例生成 | 🔴高 | 质量不稳定 | Phase 3 |
| 暴力向量检索 | 🟡中 | 性能瓶颈 | Phase 2 |
| 无缓存机制 | 🟡中 | Token浪费 | Phase 2 |
| 独立Agents无编排 | 🟡中 | 扩展困难 | Phase 4 |
| 无成本监控 | 🟢低 | 费用不可控 | Phase 5 |

---

## 3. 优化方案详解

### 3.1 维度1: 需求生成准确率优化 (60%→90%)

#### 3.1.1 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                 需求解析 Pipeline v2.0                          │
│                                                                  │
│  输入需求 ──► [预处理] ──► [结构化] ──► [LLM推理] ──► [验证]    │
│                                                                  │
│  [预处理层]                                                      │
│   • 文档分块 (Chunking)                                         │
│   • 去噪清洗 (Noise Reduction)                                  │
│   • 格式标准化                                                  │
│                                                                  │
│  [结构化层]                                                      │
│   • 领域识别 (Domain Classification)                            │
│   • 意图分类 (Intent Classification)                            │
│   • 实体提取 (NER)                                              │
│                                                                  │
│  [LLM推理层] - Chain-of-Thought                                 │
│   • 需求理解 (Requirement Understanding)                        │
│   • 功能拆解 (Functional Decomposition)                         │
│   • 依赖分析 (Dependency Analysis)                              │
│   • 冲突检测 (Conflict Detection)                               │
│                                                                  │
│  [验证层]                                                        │
│   • 一致性检查 (Consistency Check)                              │
│   • 完整性校验 (Completeness Check)                             │
│   • 置信度评分 (Confidence Scoring)                             │
│                                                                  │
│  输出: 功能点 + 业务规则 + 测试点 + 置信度分数 (0-1)            │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.2 关键技术实现

**Chain-of-Thought Prompt设计**:
```typescript
const COT_REQUIREMENT_PROMPT = `
你是一位资深需求分析师。请分析以下需求，逐步思考并提取结构化信息。

## 需求文本
{requirement}

## 分析步骤
步骤1: 理解需求背景和上下文
- 这是什么类型的系统？
- 目标用户是谁？
- 核心业务流程是什么？

步骤2: 识别功能点
- 列出所有明确提到的功能
- 识别隐含的功能需求
- 标注功能间的依赖关系

步骤3: 提取业务规则
- 数据约束（长度、格式、范围）
- 业务约束（时间、次数、权限）
- 异常处理规则

步骤4: 生成测试点
- 每个功能点的正例（P0）
- 每个功能点的反例（P1）
- 边界条件（P2）
- 异常场景（P3）

步骤5: 自检
- 检查是否有遗漏的功能
- 验证测试点是否覆盖所有规则
- 评估置信度（0-1）

## 输出格式 (JSON)
{
  "understanding": "需求理解摘要",
  "features": [
    {
      "id": "F1",
      "name": "功能名称",
      "description": "详细描述",
      "dependencies": ["F2"],
      "priority": "high/medium/low"
    }
  ],
  "businessRules": [
    {
      "type": "length/format/time/limit",
      "description": "规则描述",
      "constraint": "具体约束"
    }
  ],
  "testPoints": [
    {
      "id": "TP1",
      "name": "测试点名称",
      "type": "positive/negative/boundary/exception",
      "priority": "P0/P1/P2/P3",
      "relatedFeature": "F1"
    }
  ],
  "confidence": 0.92,
  "reasoning": "推理过程的简要说明"
}
`;
```

**Self-Consistency验证**:
```typescript
class RequirementValidator {
  async validateWithConsistency(
    requirement: string,
    parsedResult: ParsedRequirement
  ): Promise<ValidationResult> {
    // 多次采样，投票决定
    const samples = await Promise.all(
      Array(3).fill(null).map(() => 
        this.llm.generate(COT_REQUIREMENT_PROMPT, { temperature: 0.7 })
      )
    );
    
    // 统计一致性
    const featureConsistency = this.calculateConsistency(
      samples.map(s => s.features)
    );
    
    // 低于阈值则重试或标记人工审核
    if (featureConsistency < 0.8) {
      return {
        valid: false,
        confidence: featureConsistency,
        action: 'manual_review'
      };
    }
    
    return { valid: true, confidence: featureConsistency };
  }
}
```

### 3.2 维度2: 用例准确率优化 (70%→92%)

#### 3.2.1 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                 TestCase Generator v2.0                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 1: 分析与规划 (Planning)                          │   │
│  │ • 理解测试点意图                                         │   │
│  │ • 识别测试类型 (功能/性能/安全/兼容)                      │   │
│  │ • 确定测试策略 (等价类/边界值/场景法/决策表)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 2: 生成与推理 (Generation + CoT)                  │   │
│  │ • 逐步推理生成用例                                       │   │
│  │ • 应用选定测试技术                                       │   │
│  │ • 生成前置条件+步骤+预期结果                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 3: 自检与修正 (Self-Reflection)                   │   │
│  │ • 检查用例可执行性                                       │   │
│  │ • 验证预期结果可验证性                                    │   │
│  │ • 修正模糊或不完整描述                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 4: RAG增强 (Retrieval)                            │   │
│  │ • 检索相似用例作为参考                                    │   │
│  │ • 风格一致性检查                                         │   │
│  │ • 补充遗漏场景                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 5: 质量评估 (Quality Gate)                        │   │
│  │ • 用例质量评分 (1-10)                                    │   │
│  │ • 低质量用例自动重生成                                    │   │
│  │ • 输出最终用例 + 置信度                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 ReAct Pattern实现

```typescript
interface ReActStep {
  thought: string;      // 思考过程
  action: string;       // 执行动作
  observation: string;  // 观察结果
}

class ReActTestCaseGenerator {
  async generateWithReAct(testPoint: TestPoint): Promise<GeneratedTestCase[]> {
    const steps: ReActStep[] = [];
    let maxSteps = 5;
    
    while (steps.length < maxSteps) {
      // 1. Thought: 思考下一步
      const thought = await this.llm.generate(`
        基于测试点 "${testPoint.name}"，思考下一步应该做什么？
        已完成的步骤: ${JSON.stringify(steps)}
      `);
      
      // 2. Action: 执行动作
      const action = await this.decideAction(thought);
      const observation = await this.executeAction(action);
      
      steps.push({ thought, action, observation });
      
      // 3. 检查是否完成
      if (this.isGenerationComplete(steps)) {
        break;
      }
    }
    
    return this.extractTestCases(steps);
  }
  
  private async decideAction(thought: string): Promise<string> {
    // 可选动作: analyze_requirement | design_test | generate_steps | verify_result
    const actions = [
      'analyze_requirement: 分析需求理解测试点',
      'design_test: 设计测试策略和方法',
      'generate_steps: 生成测试步骤',
      'verify_result: 验证预期结果',
      'complete: 完成生成'
    ];
    
    return this.llm.selectBest(actions, thought);
  }
}
```

### 3.3 维度3: RAG动态检索优化

#### 3.3.1 分层RAG架构

```
┌─────────────────────────────────────────────────────────────────┐
│                 分层RAG架构 v2.0                                 │
│                                                                  │
│  Tier 1: 语义缓存层 (Semantic Cache)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 查询哈希缓存                                          │   │
│  │ • 相似查询直接返回 (阈值0.95)                            │   │
│  │ • 节省 30-50% Embedding API 调用                        │   │
│  │                                                         │   │
│  │ 实现: Redis + 相似度预过滤                               │   │
│  │ TTL: 24h, 命中率目标: >30%                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  Tier 2: 向量索引层 (Vector Index)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • HNSW索引加速 (vs 暴力搜索)                             │   │
│  │ • 分片存储 + 局部敏感哈希 (LSH)                          │   │
│  │ • 检索速度提升 5-10x                                    │   │
│  │                                                         │   │
│  │ 实现: ChromaDB with HNSW                              │   │
│  │ M=16, efConstruction=200, efSearch=100                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  Tier 3: 重排序层 (Reranker)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 初筛Top-20 → 精排Top-5                                │   │
│  │ • 使用Cross-Encoder模型 (bge-reranker-v2-m3)            │   │
│  │ • 准确率提升 15-20%                                     │   │
│  │                                                         │   │
│  │ 实现: 本地部署reranker模型                               │   │
│  │ 延迟: <50ms for Top-20                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  Tier 4: 多路召回 (Multi-Channel)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 向量检索 + 关键词检索 + 标签过滤                       │   │
│  │ • 融合排序 (Reciprocal Rank Fusion)                     │   │
│  │ • 召回率提升 25-30%                                     │   │
│  │                                                         │   │
│  │ 权重: 向量(0.6) + 关键词(0.3) + 标签(0.1)                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 维度4: RAG静态优化

#### 3.4.1 文档预处理流水线

```
┌─────────────────────────────────────────────────────────────────┐
│ 离线预处理流水线 (每日凌晨2点执行)                              │
│                                                                  │
│  原始文档                                                        │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ 文档解析    │───►│ 内容分块    │───►│ 元数据提取  │          │
│  │ • PDF       │    │ • 语义分块  │    │ • 标签      │          │
│  │ • Word      │    │ • 递归分块  │    │ • 摘要      │          │
│  │ • Markdown  │    │ • 滑动窗口  │    │ • 关键词    │          │
│  └─────────────┘    └─────────────┘    └──────┬──────┘          │
│                                                │                 │
│     ┌──────────────────────────────────────────┘                 │
│     ▼                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ 质量评分    │───►│ 嵌入生成    │───►│ 索引构建    │          │
│  │ • 完整性    │    │ • 批量生成  │    │ • HNSW      │          │
│  │ • 相关性    │    │ • 量化压缩  │    │ • 倒排索引  │          │
│  │ • 去重      │    │ • 本地缓存  │    │ • 分层索引  │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 增量更新策略

```typescript
class IncrementalIndexManager {
  async updateIndex(changes: DocumentChange[]): Promise<void> {
    // 1. 差异检测
    const diff = await this.detectChanges(changes);
    
    // 2. 分类处理
    const toAdd = diff.filter(c => c.type === 'ADD');
    const toUpdate = diff.filter(c => c.type === 'UPDATE');
    const toDelete = diff.filter(c => c.type === 'DELETE');
    
    // 3. 批量处理
    await Promise.all([
      this.batchAdd(toAdd),
      this.batchUpdate(toUpdate),
      this.batchDelete(toDelete)
    ]);
    
    // 4. 局部优化 (非全量重建)
    await this.optimizeAffectedRegions(diff);
  }
  
  // 只重建受影响的索引区域，节省90%时间
  private async optimizeAffectedRegions(changes: DocumentChange[]): Promise<void> {
    const affectedBuckets = this.getAffectedBuckets(changes);
    for (const bucket of affectedBuckets) {
      await this.rebuildBucket(bucket);
    }
  }
}
```

### 3.5 维度5: Token消耗优化

#### 3.5.1 智能成本路由

```typescript
class CostOptimizedRouter {
  private costBudget = 0.5; // 单次请求预算$0.5
  
  async routeByComplexity(prompt: string, taskType: TaskType): Promise<string> {
    // 1. 评估复杂度
    const complexity = await this.assessComplexity(prompt);
    
    // 2. 根据复杂度和预算选择模型
    if (complexity < 0.3 && this.getRemainingBudget() > 0.1) {
      // 简单任务用轻量模型
      return 'qwen3-32b'; // $0.0005/1K tokens
    } else if (complexity < 0.7) {
      // 中等任务用标准模型
      return 'kimi-k2.5'; // $0.001/1K tokens
    } else {
      // 复杂任务用强模型
      return 'qwen3-72b'; // $0.002/1K tokens
    }
  }
  
  // 动态提示词压缩
  async compressPrompt(prompt: string, ratio: number = 0.7): Promise<string> {
    return this.llm.generate(`
      压缩以下提示词，保留核心信息，压缩率${ratio}:
      ${prompt}
    `);
  }
}
```

### 3.6 维度6: LangGraph工作流编排

#### 3.6.1 状态图设计

```typescript
// State Schema
interface AgentState {
  // 输入
  input: {
    document?: ParsedDocument;
    requirementText: string;
    config: GenerationConfig;
  };
  
  // 中间状态
  intermediate: {
    features?: Feature[];
    businessRules?: BusinessRule[];
    testPoints?: TestPoint[];
    similarCases?: RetrievedCase[];
    generatedCases?: GeneratedTestCase[];
  };
  
  // 输出
  output: {
    finalCases: GeneratedTestCase[];
    quality: QualityReport;
    confidence: number;
  };
  
  // 元数据
  metadata: {
    startTime: number;
    currentStep: string;
    retryCount: number;
    tokensUsed: number;
    cost: number;
  };
}

// Workflow Graph
const workflow = new StateGraph<AgentState>({
  channels: {
    input: { value: (x, y) => y ?? x },
    intermediate: { value: (x, y) => ({ ...x, ...y }) },
    output: { value: (x, y) => y ?? x },
    metadata: { value: (x, y) => ({ ...x, ...y }) }
  }
})
  .addNode('document_parser', documentParserNode)
  .addNode('requirement_analyzer', requirementAnalyzerNode)
  .addNode('feature_decomposer', featureDecomposerNode)
  .addNode('rag_retriever', ragRetrieverNode)
  .addNode('test_generator', testGeneratorNode)
  .addNode('self_reflection', selfReflectionNode)
  .addNode('human_review', humanReviewNode)
  .addNode('quality_gate', qualityGateNode)
  .addEdge(START, 'document_parser')
  .addEdge('document_parser', 'requirement_analyzer')
  .addEdge('requirement_analyzer', 'feature_decomposer')
  .addEdge('feature_decomposer', 'rag_retriever')
  .addEdge('rag_retriever', 'test_generator')
  .addEdge('test_generator', 'self_reflection')
  .addConditionalEdges('self_reflection', reflectionRouter, {
    pass: 'quality_gate',
    retry: 'test_generator',
    fail: 'human_review'
  })
  .addConditionalEdges('quality_gate', qualityRouter, {
    approve: END,
    review: 'human_review',
    regenerate: 'feature_decomposer'
  })
  .addConditionalEdges('human_review', humanRouter, {
    approve: END,
    retry: 'test_generator',
    edit: 'test_generator' // 带人工反馈重新生成
  });
```

### 3.7 维度7: 性能优化

#### 3.7.1 性能优化矩阵

| 优化领域 | 策略 | 预期提升 | 实现复杂度 |
|----------|------|----------|------------|
| **模型调用** | 异步+流式 | 30% ↓延迟 | 低 |
| **连接池** | Keep-Alive复用 | 20% ↓延迟 | 低 |
| **向量索引** | HNSW预加载 | 40% ↓延迟 | 中 |
| **查询缓存** | Redis语义缓存 | 60% ↓(命中) | 中 |
| **批量生成** | 并发控制(3-5) | 3x throughput | 低 |
| **Prompt压缩** | 动态长度调整 | 15% ↓tokens | 中 |

---

## 4. 实施路线图

### 4.1 Phase 1: 基础架构升级 (Week 1-2)

**目标**: 搭建本地嵌入服务，优化基础配置

| Batch | 任务 | 详细内容 | 验收标准 | 工期 |
|-------|------|----------|----------|------|
| **1.1** | 本地bge-m3部署 | Docker环境搭建、模型下载、服务启动 | /health返回200，推理<100ms | 1天 |
| **1.2** | Embedding服务封装 | TS接口设计、Python桥接、批量处理 | 批量embed 10条<500ms | 2天 |
| **1.3** | ModelManager升级 | 支持K2.5+Qwen3、路由策略、Fallback | 双模型切换正常，降级可用 | 2天 |
| **1.4** | 基础性能测试 | 基准测试脚本、性能数据记录、对比分析 | 测试覆盖>80%，数据记录完整 | 2天 |
| **1.5** | 文档更新 | KIMI.md更新、配置文档、部署手册 | 文档通过review | 1天 |

**Phase 1检查点**:
- [ ] bge-m3本地服务可用 (localhost:8000)
- [ ] Embedding API响应<100ms
- [ ] ModelManager支持K2.5+Qwen3双模型
- [ ] 基准测试数据记录（用于后续对比）

### 4.2 Phase 2: RAG架构重构 (Week 3-4)

**目标**: 实现分层RAG，召回率提升至85%

| Batch | 任务 | 详细内容 | 验收标准 | 工期 |
|-------|------|----------|----------|------|
| **2.1** | 语义缓存层 | Redis缓存、相似度预过滤、TTL策略 | 缓存命中率>30% | 2天 |
| **2.2** | HNSW向量索引 | ChromaDB迁移、HNSW参数调优、索引构建 | 检索速度提升5x，<50ms | 2天 |
| **2.3** | 重排序层 | bge-reranker部署、Cross-Encoder实现 | 准确率提升15% | 2天 |
| **2.4** | 多路召回 | 向量+关键词+标签融合、RRF排序 | 召回率>85% | 2天 |
| **2.5** | RAG静态优化 | 增量更新、预计算、分层存储 | 成本降低40% | 2天 |

**Phase 2检查点**:
- [ ] 语义缓存命中率>30%
- [ ] 向量检索延迟<50ms
- [ ] 整体召回率>85%
- [ ] Token成本降低40%

### 4.3 Phase 3: 准确率优化 (Week 5-6)

**目标**: 需求准确率60%→90%，用例准确率70%→92%

| Batch | 任务 | 详细内容 | 验收标准 | 工期 |
|-------|------|----------|----------|------|
| **3.1** | Chain-of-Thought需求解析 | CoT Prompt设计、多步推理实现、Self-Consistency | 需求准确率>90% | 2天 |
| **3.2** | Few-shot动态选择 | 示例库构建、相似度选择、动态注入 | 示例选择准确率>85% | 2天 |
| **3.3** | Self-Reflection机制 | 自检Prompt、质量评估、自动修正 | 自检通过率>95% | 2天 |
| **3.4** | ReAct用例生成 | ReAct Pattern实现、多步推理、工具调用 | 生成质量评分>8/10 | 2天 |
| **3.5** | Multi-Agent验证 | 交叉验证Agent、一致性检查、冲突解决 | 人工审核通过率>95% | 2天 |

**Phase 3检查点**:
- [ ] 需求解析准确率>90%
- [ ] 用例生成准确率>92%
- [ ] Self-Reflection覆盖率100%
- [ ] 人工审核通过率>95%

### 4.4 Phase 4: LangGraph编排 (Week 7-8)

**目标**: 完整工作流编排，支持HITL

| Batch | 任务 | 详细内容 | 验收标准 | 工期 |
|-------|------|----------|----------|------|
| **4.1** | StateGraph状态设计 | 状态Schema设计、Channel配置、持久化 | 7节点状态流转正常 | 2天 |
| **4.2** | 6-Agent节点实现 | Parse→Analyze→Decompose→Retrieve→Generate→Review | 全链路打通 | 3天 |
| **4.3** | 条件边与循环 | 动态路由、回滚机制、重试策略 | 支持回滚到任意节点 | 2天 |
| **4.4** | 人工审核台(HITL) | UI设计、API实现、状态同步、通知机制 | 人工可介入审核 | 2天 |
| **4.5** | 可观测性集成 | LangSmith集成、日志追踪、性能监控 | 全链路可观测 | 1天 |

**Phase 4检查点**:
- [ ] LangGraph工作流端到端运行
- [ ] 人工审核节点可介入
- [ ] 支持回滚到任意节点
- [ ] 全链路可观测（日志+追踪）

### 4.5 Phase 5: Token优化与性能 (Week 9)

**目标**: 成本降低60%，延迟降低50%

| Batch | 任务 | 详细内容 | 验收标准 | 工期 |
|-------|------|----------|----------|------|
| **5.1** | 智能截断策略 | 动态Prompt压缩、摘要提取、信息保留 | Token使用减少20% | 1天 |
| **5.2** | 分层调用策略 | 复杂度评估、模型路由、成本预算 | 简单任务用轻量模型 | 1天 |
| **5.3** | 批量处理优化 | 动态批处理、并发控制、流水线优化 | 吞吐量提升3x | 1天 |
| **5.4** | 响应缓存机制 | 语义缓存、TTL策略、缓存预热 | 缓存命中率>25% | 1天 |
| **5.5** | 性能监控面板 | 实时成本监控、延迟告警、Dashboard | 监控可用 | 1天 |

**Phase 5检查点**:
- [ ] Token成本降低60%（对比Phase 1基准）
- [ ] 平均响应时间<4s
- [ ] 缓存命中率>25%
- [ ] 性能监控Dashboard可用

---

## 5. Subagent TDD执行规范

### 5.1 Subagent任务拆分原则

```
每个Batch的任务拆分:
┌─────────────────────────────────────────────────────────────┐
│ 1. 分析依赖                                                  │
│    - 识别任务间的依赖关系                                     │
│    - 确定执行顺序                                             │
│                                                              │
│ 2. 独立拆分                                                  │
│    - 将任务拆分为3-5个独立子任务                              │
│    - 确保子任务间无循环依赖                                   │
│    - 每个子任务可独立测试                                     │
│                                                              │
│ 3. 并行执行                                                  │
│    - 启动3-5个Subagent同时执行                               │
│    - 每个Subagent负责一个子任务                              │
│    - 设置超时和重试机制                                       │
│                                                              │
│ 4. 结果整合                                                  │
│    - 收集Subagent输出                                        │
│    - 检查冲突和依赖                                           │
│    - 合并代码和文档                                           │
│                                                              │
│ 5. TDD验证                                                   │
│    - 运行单元测试 (npm test)                                 │
│    - 运行集成测试                                            │
│    - 覆盖率检查 (>80%)                                       │
│                                                              │
│ 6. 验收确认                                                  │
│    - 检查验收标准                                            │
│    - 更新Plan进度                                            │
│    - 提交代码                                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Subagent Prompt模板

```typescript
const SUBAGENT_PROMPT_TEMPLATE = `
你是AI架构优化项目的Subagent，负责执行特定任务。

## 当前批次信息
Phase: {phase}
Batch: {batch}
任务: {task}

## 你的职责
1. 实现指定的功能模块
2. 编写完整的单元测试
3. 确保代码通过所有测试
4. 输出实现报告

## 技术规范
- 使用TypeScript
- 遵循现有代码风格
- 添加完整类型定义
- 错误处理完善

## 输出要求
1. 代码实现 (完整文件内容)
2. 测试代码 (覆盖>80%)
3. 实现报告 (含设计思路)

## 注意事项
- 不要修改无关文件
- 保持向后兼容
- 添加必要的注释
`;
```

### 5.3 质量门禁

每个Batch必须通过以下检查才能标记完成：

| 检查项 | 标准 | 工具 |
|--------|------|------|
| 单元测试 | 覆盖率>80%，全部通过 | Jest |
| 类型检查 | 无TypeScript错误 | tsc |
| 代码风格 | 通过ESLint检查 | ESLint |
| 功能验收 | 满足验收标准 | 手动 |
| 性能基准 | 不劣化现有性能 | benchmark |

---

## 6. 技术规范

### 6.1 代码规范

```typescript
// AI模块代码规范示例

// 1. 类型定义完整
interface RequirementParseResult {
  features: Feature[];
  businessRules: BusinessRule[];
  testPoints: TestPoint[];
  confidence: number;  // 0-1
  metadata: {
    model: string;
    tokensUsed: number;
    latency: number;
  };
}

// 2. 错误处理完善
class RequirementParser {
  async parse(requirement: string): Promise<Result<RequirementParseResult, ParseError>> {
    try {
      // 实现...
      return ok(result);
    } catch (error) {
      return err(new ParseError('Failed to parse requirement', { cause: error }));
    }
  }
}

// 3. 日志记录完整
logger.info('[RequirementParser] Parsing started', {
  requirementLength: requirement.length,
  model: this.config.model
});
```

### 6.2 接口契约

```typescript
// Embedding服务接口
interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  health(): Promise<HealthStatus>;
}

// RAG检索接口
interface RAGRetriever {
  retrieve(query: string, options?: RetrieveOptions): Promise<RetrievalResult[]>;
  add(document: Document): Promise<void>;
  update(id: string, document: Document): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 6.3 测试策略

```typescript
// 测试金字塔
// 1. 单元测试 (70%)
describe('RequirementParser', () => {
  it('should extract features from simple requirement', async () => {
    const result = await parser.parse('用户支持登录功能');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].name).toBe('登录功能');
  });
  
  it('should handle complex conditional requirements', async () => {
    // 测试复杂条件语句
  });
});

// 2. 集成测试 (20%)
describe('RAG Pipeline', () => {
  it('should retrieve relevant cases end-to-end', async () => {
    const results = await rag.retrieve('登录功能测试');
    expect(results[0].similarity).toBeGreaterThan(0.8);
  });
});

// 3. E2E测试 (10%)
describe('AI Generation E2E', () => {
  it('should generate test cases from requirement', async () => {
    const workflow = new AIGenerationWorkflow();
    const result = await workflow.run({
      requirement: '用户登录功能，密码错误3次锁定15分钟'
    });
    expect(result.testCases).toHaveLengthGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

---

## 7. 风险与应对

### 7.1 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| **bge-m3本地部署性能不达预期** | 中 | 高 | 备选方案：GTE-Qwen2云端；性能调优文档 |
| **LangGraph学习曲线陡峭** | 高 | 中 | 提前进行技术调研；预留缓冲时间 |
| **准确率提升不达目标** | 中 | 高 | 设置中间里程碑；引入人工反馈循环 |
| **性能优化效果不明显** | 低 | 中 | 基准测试先行；设定最低优化目标 |

### 7.2 资源风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| **GPU资源不足** | 中 | 高 | CPU降级方案；云端备选 |
| **Subagent执行失败** | 中 | 中 | 重试机制；人工接管预案 |
| **工期延误** | 中 | 高 | Phase独立可交付；优先级排序 |

### 7.3 缓解策略

```
风险缓解策略:
┌─────────────────────────────────────────────────────────────┐
│ 1. 技术风险缓解                                              │
│    • 每个Phase开始前进行技术Spike                           │
│    • 关键组件准备备选方案                                   │
│    • 设定可接受的最低目标                                   │
│                                                              │
│ 2. 资源风险缓解                                              │
│    • 提前准备硬件环境                                       │
│    • Subagent任务设置超时和重试                            │
│    • 每个Phase设定MVP目标                                   │
│                                                              │
│ 3. 进度风险缓解                                              │
│    • 每周进度Review                                         │
│    • 及时调整资源分配                                       │
│    • 必要时裁剪非核心功能                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 附录

### 8.1 术语表

| 术语 | 说明 |
|------|------|
| **CoT** | Chain-of-Thought，思维链，让LLM展示推理过程 |
| **ReAct** | Reasoning + Acting，推理与行动结合的模式 |
| **RAG** | Retrieval-Augmented Generation，检索增强生成 |
| **HNSW** | Hierarchical Navigable Small World，分层导航小世界算法 |
| **HITL** | Human-In-The-Loop，人机协同 |
| **bge-m3** | BAAI General Embedding，智源开源嵌入模型 |
| **TDD** | Test-Driven Development，测试驱动开发 |

### 8.2 参考资料

- [LangGraph文档](https://langchain-ai.github.io/langgraph/)
- [bge-m3模型](https://huggingface.co/BAAI/bge-m3)
- [HNSW算法](https://arxiv.org/abs/1603.09320)
- [ReAct Pattern](https://arxiv.org/abs/2210.03629)

### 8.3 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-09 | 初始版本 | AI Team |

---

## ✅ 最终检查清单

### 开发完成后执行:

- [ ] **功能完整度检查** (`/inspect`)
  - [ ] 所有AI Agents功能完整
  - [ ] RAG检索链路正常
  - [ ] LangGraph工作流可运行
  - [ ] 人工审核台可用

- [ ] **BugHunter深度检查** (`/bughunter`)
  - [ ] 扫描所有AI相关代码
  - [ ] 修复类型错误和空指针
  - [ ] 修复性能瓶颈
  - [ ] 修复安全漏洞

- [ ] **健康度检查** (`/health`)
  - [ ] 代码健康度>90分
  - [ ] 测试覆盖率>85%
  - [ ] 构建成功率100%
  - [ ] 类型错误<5个

- [ ] **最终交付**
  - [ ] 更新memory.md
  - [ ] 更新所有文档
  - [ ] 清理临时文件 (`/cleanup`)
  - [ ] 提交代码到Git

---

**文档结束**

> 🚀 **下一步**: 执行Phase 1.1 - 本地bge-m3部署