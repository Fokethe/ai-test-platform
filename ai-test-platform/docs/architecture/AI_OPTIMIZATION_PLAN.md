# AI 功能优化规划（Plan Mode）

> 基于 Coze 智能体设计文档分析  
> 创建时间: 2026-02-26  
> 参考: AITS 系统 + Coze 智能体工作流

---

## 📋 需求分析（当前问题）

### 现有 AI 生成痛点

| 问题 | 现状 | 影响 |
|------|------|------|
| 输入方式单一 | 仅支持文本描述 | 用户需要手写需求 |
| 输出格式固定 | 仅生成表格用例 | 不符合测试人员习惯 |
| 缺乏上下文 | 不了解项目结构 | 生成用例与实际脱节 |
| 无协作集成 | 无法导出到飞书/钉钉 | 需要手动复制粘贴 |
| 无工作流 | 一次性生成 | 无法迭代优化 |

### Coze 系统亮点（值得借鉴）

```
┌─────────────────────────────────────────────────────────────┐
│  Coze 智能体工作流                                            │
├─────────────────────────────────────────────────────────────┤
│  1. 需求输入 → 支持飞书文档/本地文件/文本                      │
│  2. AI分析   → 需求解析 → 测试点提取 → 用例生成               │
│  3. 可视化   → XMind思维导图格式展示                          │
│  4. 协作集成 → 一键发布到飞书/钉钉/企业微信                    │
│  5. 迭代优化 → 可针对单个节点增删改                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 优化方向（联想与规划）

### 方向1: 多源需求输入（高优先级）

**技术可行**: ✅ 当前技术栈支持  
**实现方案**:

```typescript
// 新增需求输入方式
interface RequirementInput {
  type: 'text' | 'file' | 'feishu' | 'url';
  content: string;
  metadata: {
    filename?: string;
    feishuToken?: string;
    url?: string;
  };
}

// 文件解析支持
- PDF 需求文档 → pdf-parse
- Word 文档 → mammoth
- Excel 用例 → xlsx
- 图片需求 → OCR (Tesseract)
```

**产出**:
- `/ai-requirements/upload` - 文件上传解析
- `/ai-requirements/feishu` - 飞书文档拉取
- `/ai-requirements/url` - URL内容抓取

---

### 方向2: AI 测试用例思维导图（高优先级）

**技术可行**: ✅ 现有 AI SDK + 新格式输出  
**实现方案**:

```typescript
// 新增输出格式
interface AIOutputFormat {
  type: 'table' | 'xmind' | 'markdown' | 'excel';
  content: any;
}

// XMind 格式生成
- 模块 → 分支节点
- 测试点 → 子节点
- 用例 → 叶子节点（含步骤/预期）

// 使用库
- xmind-generator (npm)
- 或生成 Markdown → 导入 XMind
```

**页面改造**:
```
当前: /tests?tab=ai
        ↓
新: /ai-workspace
   ├── 需求输入区（文本/文件/飞书）
   ├── AI 分析进度
   ├── 思维导图预览（可交互）
   ├── 批量选择 → 导入用例
   └── 导出（XMind/Excel/飞书）
```

---

### 方向3: 项目上下文感知（中优先级）

**技术可行**: ✅ RAG + 向量数据库  
**实现方案**:

```typescript
// 构建项目知识库
interface ProjectContext {
  pages: Page[];           // 系统页面结构
  existingCases: Test[];   // 已有用例（避免重复）
  history: Execution[];    // 执行历史（高频失败点）
  glossary: Term[];        // 业务术语表
}

// RAG 增强生成
- 需求 → 嵌入向量
- 相似用例检索 → 提示词增强
- 生成时参考已有用例风格
```

**产出**:
- 向量数据库: pgvector / chroma
- 知识库构建脚本
- 上下文感知的 Prompt 模板

---

### 方向4: 协作平台集成（中优先级）

**技术可行**: ✅ Webhook + API  
**实现方案**:

```typescript
// 集成目标
interface IntegrationTarget {
  platform: 'feishu' | 'dingtalk' | 'wecom' | 'lark';
  webhook: string;
  template: string;
}

// 飞书集成示例
- 飞书开放平台 API
- 应用凭证: App ID + App Secret
- 消息卡片模板（富文本）
- 文档 API（创建/更新）
```

**页面**:
- 设置 → 集成 → 飞书/钉钉配置
- AI 生成结果 → 一键发送

---

### 方向5: 可视化工作流（低优先级）

**技术可行**: ✅ React Flow / X6  
**实现方案**:

```typescript
// 工作流节点
interface WorkflowNode {
  id: string;
  type: 'input' | 'ai' | 'review' | 'output';
  data: {
    label: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    result?: any;
  };
}

// 使用库
- @xyflow/react (React Flow)
- 或 AntV X6
```

**产出**:
- AI 工作流画布
- 可拖拽调整流程
- 每个节点可编辑/重试

---

## 🚀 实施计划（分阶段）

### Phase 1: 多源输入 + XMind 输出（2周）

```markdown
Week 1:
- Day 1-2: 文件上传组件 + PDF/Word/Excel 解析
- Day 3-4: 飞书文档 API 集成
- Day 5-7: XMind 格式生成器

Week 2:
- Day 8-10: /ai-workspace 页面重构
- Day 11-12: 思维导图预览组件
- Day 13-14: 测试 + Bug 修复
```

**产出**:
- 支持 4 种输入方式
- XMind 格式导出
- 新的 AI 工作空间页面

---

### Phase 2: 上下文感知 + 知识库（2周）

```markdown
Week 3:
- Day 1-3: 向量数据库搭建 (pgvector)
- Day 4-5: 项目数据向量化脚本
- Day 6-7: RAG 检索逻辑

Week 4:
- Day 8-10: 上下文增强的 Prompt
- Day 11-12: 相似用例推荐
- Day 13-14: 测试 + 优化
```

**产出**:
- 项目知识库
- 上下文感知的 AI 生成
- 相似用例推荐功能

---

### Phase 3: 协作集成（1.5周）

```markdown
Week 5:
- Day 1-3: 飞书 API 集成
- Day 4-5: 钉钉 API 集成
- Day 6-7: 消息卡片模板

Week 6:
- Day 8-9: 集成设置页面
- Day 10-11: 一键发送功能
- Day 12-13: 测试
```

**产出**:
- 飞书/钉钉集成
- 一键发送 AI 生成结果
- 集成设置管理

---

### Phase 4: 可视化工作流（2周，可选）

```markdown
Week 7-8:
- React Flow 集成
- 节点组件开发
- 工作流状态管理
- 画布交互优化
```

---

## 📊 技术选型

| 功能 | 技术方案 | 理由 |
|------|----------|------|
| 文件解析 | pdf-parse + mammoth + xlsx | 成熟稳定 |
| XMind生成 | xmind-generator | 官方库 |
| 向量数据库 | pgvector | 与Prisma兼容 |
| 嵌入模型 | OpenAI text-embedding-3-small | 性价比高 |
| 飞书集成 | @larksuiteoapi/node-sdk | 官方SDK |
| 流程图 | @xyflow/react | React生态 |

---

## 💰 成本预估

| 项目 | 成本 | 说明 |
|------|------|------|
| OpenAI API | ~$0.02/次 | 嵌入+生成 |
| 向量数据库 | 免费 | 本地pgvector |
| 飞书API | 免费 | 基础版限额 |
| 开发时间 | 5.5周 | 1人全职 |

---

## 🎯 预期效果

### 用户体验提升

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| 输入方式 | 1种 | 4种 | 300% |
| 输出格式 | 1种 | 3种 | 200% |
| 上下文相关性 | 低 | 高 | - |
| 协作效率 | 手动复制 | 一键发送 | 80% ↓ |

### 业务价值

- **需求理解更准确**: 参考项目历史用例
- **生成速度更快**: 复用相似用例结构
- **协作更高效**: 直接导出到飞书/钉钉
- **可追溯性更好**: 工作流可视化

---

## 🤔 需要确认的问题

1. **优先级确认**: Phase 1 是否立即开始？
2. **飞书集成**: 是否有企业飞书账号用于测试？
3. **XMind 格式**: 是否需要支持导入回 XMind 软件？
4. **向量数据库**: 使用 pgvector 还是单独部署 Chroma？
5. **开源 vs 商业**: AI 模型继续用 OpenAI 还是切换国产（文心/通义）？

---

**计划制定**: 2026-02-26  
**计划版本**: v1.0  
**等待确认**: 用户反馈后进入执行阶段
