# 构建错误收集清单

**验收批次**: acceptance-20260317-006  
**收集时间**: 2026-03-17 11:47  
**状态**: 🔍 问题收集中

---

## TypeScript类型错误清单

### AI/RAG模块 (13个)

| # | 文件路径 | 错误描述 | 问题类型 | 优先级 |
|---|---------|---------|---------|--------|
| 1 | `src/lib/ai/rag/rag-service.ts:226` | `c.text` → `c.content` | Citation接口属性名 | P0 |
| 2 | `src/lib/ai/rag/query/hyde-generator.ts` | 缺少 `generateHypotheticalDocs` 方法 | 方法缺失 | P0 |
| 3 | `src/lib/ai/rag/rag-service.ts:309` | `semanticCache.get(queryEmbedding)` 参数数量不匹配 | API调用错误 | P0 |
| 4 | `src/lib/ai/rag/rag-service.ts:312` | 缓存返回类型需要断言 `cached as RAGQueryResult` | 类型断言 | P0 |
| 5 | `src/lib/ai/rag/retrieval.ts:7` | `import { TestCase }` → `import { GeneratedTestCase as TestCase }` | 导入错误 | P0 |
| 6 | `src/lib/ai/agents/testcase-generator.ts:23` | `GeneratedTestCase` 缺少 `module?: string` 属性 | 接口属性缺失 | P0 |
| 7 | `src/lib/ai/rag/few-shot-selector.ts:8` | 本地TestCase与GeneratedTestCase类型冲突 | 类型定义冲突 | P0 |
| 8 | `src/lib/ai/rag/few-shot-selector.ts:211` | `c.module` 可能为undefined | 空值检查 | P1 |
| 9 | `src/lib/ai/rag/retrieval.ts:91` | `testCase.module.toLowerCase()` → `testCase.module?.toLowerCase()` | 空值检查 | P1 |
| 10 | `src/lib/ai/rag/vector/chroma-store.ts:63` | ChromaClient类型与chromadb库冲突 | 类型冲突 | P1 |
| 11 | `src/lib/ai/vector/chroma.ts:31` | `metadata: Record<string, unknown>` → `metadata: any` | 类型不兼容 | P1 |
| 12 | `src/lib/ai/vector/chroma.ts:59` | `metadatas` 类型不兼容 | 类型不兼容 | P1 |
| 13 | `src/lib/ai/vector/embeddings.ts:15` | `openai.embedding(this.model, { dimensions })` 参数错误 | API调用错误 | P0 |

### 缓存模块 (2个)

| # | 文件路径 | 错误描述 | 问题类型 | 优先级 |
|---|---------|---------|---------|--------|
| 14 | `src/lib/cache/api-cache.ts:46` | `startCleanup` 方法不存在 | 方法缺失 | P0 |
| 15 | `src/lib/cache/api-cache.ts` | 文件不完整，缺少方法 | 文件不完整 | P0 |

### Prisma模型缺失 (3个+)

| # | 文件路径 | 错误描述 | 问题类型 | 优先级 |
|---|---------|---------|---------|--------|
| 16 | `src/lib/knowledge/permission-manager.ts:58` | `prisma.departmentMember` 模型不存在 | Prisma模型缺失 | P0 |
| 17 | `src/lib/knowledge/permission-manager.ts:82` | `prisma.projectMember` 模型不存在 | Prisma模型缺失 | P0 |
| 18 | `src/lib/knowledge/permission-manager.ts` | `prisma.knowledgePermission` 模型可能不存在 | Prisma模型缺失 | P0 |
| 19 | `src/lib/knowledge/permission-manager.ts` | `prisma.knowledgeBase` 模型可能不存在 | Prisma模型缺失 | P0 |

---

## 错误分类统计

| 类别 | 数量 | 说明 |
|------|------|------|
| P0 (阻断性) | 14 | 必须修复，否则构建失败 |
| P1 (高优先级) | 6 | 需要修复，影响类型安全 |
| **总计** | **20** | 已收集错误 |

---

## 主要问题类别

1. **AI/RAG模块类型问题** (13个) - 类型定义冲突、接口属性不匹配
2. **缓存模块不完整** (2个) - 方法缺失、文件不完整
3. **Prisma模型缺失** (5个+) - departmentMember, projectMember, knowledgePermission, knowledgeBase
4. **ChromaDB类型兼容** (3个) - 库类型与自定义类型冲突

---

## 下一步操作选项

1. **继续收集**: 运行构建获取更多错误
2. **批量修复**: 使用SubAgent并行修复所有问题
3. **生成报告**: 生成详细验收报告
4. **暂停验收**: 保存当前状态

---

*等待下一步指示*
