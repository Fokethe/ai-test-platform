# encoding: utf-8
# -*- coding: utf-8 -*-

# Phase 6: MCP工具完善执行计划 (v2.1)

> **版本**: v1.0  
> **创建日期**: 2026-03-10  
> **执行模式**: Subagent TDD  
> **总工期**: 2周 (5个Batch)  
> **作者**: AI Team

---

## 📋 执行摘要

### 6.1 优化目标

| 维度 | 当前值 | 目标值 | 提升幅度 | 优先级 |
|------|--------|--------|----------|--------|
| **MCP工具覆盖率** | 20% | 80% | +300% | P0 |
| **工具调用成功率** | 60% | 95% | +58% | P0 |
| **工具响应时间** | 2s | 500ms | -75% | P1 |
| **工具可扩展性** | 低 | 高 | - | P1 |

### 6.2 技术选型

```yaml
mcp:
  framework: model-context-protocol
  version: 2024-11-05
  transport: stdio / http
  
tools:
  document:
    - pdf_parser        # PDF文档解析
    - docx_parser       # Word文档解析
    - ocr_extractor     # OCR图片识别
  test_technique:
    - equivalence_class # 等价类划分
    - boundary_value    # 边界值分析
    - scenario_method   # 场景法
    - decision_table    # 决策表
  integration:
    - jira_sync         # Jira问题同步
    - testrail_export   # TestRail导出
    - feishu_webhook    # 飞书消息推送
```

### 6.3 实施策略

- **执行模式**: Subagent TDD (5个Batch)
- **分批策略**: 每个Batch 2-3天
- **验收标准**: 每个Batch必须有测试覆盖>80%，通过TDD验证
- **回滚策略**: 每个Batch独立，失败可回滚到上一稳定版本

---

## 🔍 现状分析

### 6.1 当前MCP实现痛点

```
┌─────────────────────────────────────────────────────────────┐
│ 当前实现: 简单函数调用                                       │
│                                                              │
│ 问题1: 无标准化接口                                          │
│   - 每个工具独立实现                                         │
│   - 接口不统一，难以扩展                                     │
│   - 工具发现困难                                             │
│                                                              │
│ 问题2: 缺乏错误处理                                          │
│   - 工具调用失败无重试                                       │
│   - 错误信息不明确                                           │
│   - 无降级策略                                               │
│                                                              │
│ 问题3: 无工具注册机制                                        │
│   - 新工具需要手动集成                                       │
│   - 无法动态发现可用工具                                     │
│   - 工具元数据缺失                                           │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 与架构思路的差距

| 能力 | 当前 | 架构思路 | 差距 |
|------|------|----------|------|
| **PDF解析** | 基础文本提取 | Marker深度解析 | 2代差距 |
| **OCR识别** | 未实现 | PaddleOCR | 1代差距 |
| **测试技术工具** | 未实现 | 等价类/边界值/场景法 | 1代差距 |
| **工具编排** | 独立调用 | MCP统一编排 | 1代差距 |

---

## 🎯 优化方案详解

### 6.1 MCP核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server Architecture                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MCP Server Host                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   Tool A    │  │   Tool B    │  │   Tool C    │     │   │
│  │  │  Registry   │  │  Registry   │  │  Registry   │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │   │
│  │         └─────────────────┼─────────────────┘          │   │
│  │                           ▼                           │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │              Tool Registry                      │  │   │
│  │  │  • 工具发现 (list_tools)                        │  │   │
│  │  │  • 元数据管理 (schema + description)            │  │   │
│  │  │  • 生命周期管理 (register / unregister)         │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ stdio / http                      │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MCP Client                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Tool Call  │  │   Schema    │  │   Error     │     │   │
│  │  │  Request    │  │  Validation │  │  Handling   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 文档解析工具集

#### 6.2.1 PDF解析工具 (pdf-parser)

```typescript
interface PDFParserTool {
  name: 'parse_pdf';
  description: '解析PDF文档，提取结构化内容';
  input: {
    file_path: string;
    options?: {
      extract_tables?: boolean;
      extract_images?: boolean;
      preserve_layout?: boolean;
    };
  };
  output: {
    title: string;
    content: string;
    pages: PageContent[];
    tables: TableContent[];
    metadata: PDFMetadata;
  };
}

// 实现: 基于 pdf-parse + pdf2pic
class PDFParserTool implements MCPTool {
  async execute(input: PDFParserInput): Promise<PDFParserOutput> {
    // 1. 提取文本
    const text = await this.extractText(input.file_path);
    // 2. 提取表格
    const tables = input.options?.extract_tables 
      ? await this.extractTables(input.file_path) 
      : [];
    // 3. 提取元数据
    const metadata = await this.extractMetadata(input.file_path);
    
    return { title, content, pages, tables, metadata };
  }
}
```

#### 6.2.2 DOCX解析工具 (docx-parser)

```typescript
interface DOCXParserTool {
  name: 'parse_docx';
  description: '解析Word文档，保留层级结构';
  input: {
    file_path: string;
    options?: {
      extract_headings?: boolean;
      extract_tables?: boolean;
      extract_images?: boolean;
    };
  };
  output: {
    title: string;
    headings: Heading[];
    content: string;
    tables: TableContent[];
    structure: DocumentStructure;
  };
}

// 实现: 基于 mammoth.js
class DOCXParserTool implements MCPTool {
  async execute(input: DOCXParserInput): Promise<DOCXParserOutput> {
    // 使用 mammoth 提取结构化内容
    const result = await mammoth.convertToHtml({ path: input.file_path });
    // 解析HTML结构，提取标题层级
    const structure = this.parseStructure(result.value);
    
    return { title, headings, content, tables, structure };
  }
}
```

#### 6.2.3 OCR图片识别工具 (ocr-extractor)

```typescript
interface OCRExtractorTool {
  name: 'extract_ocr';
  description: '从图片中提取文本，支持多语言';
  input: {
    image_path: string;
    language?: string; // 'chi_sim+eng'
    options?: {
      preprocess?: boolean; // 图像预处理
      enhance?: boolean;    // 文字增强
    };
  };
  output: {
    text: string;
    confidence: number;
    regions: OCRRegion[];
    language: string;
  };
}

// 实现: 基于 PaddleOCR / Tesseract
class OCRExtractorTool implements MCPTool {
  async execute(input: OCRExtractorInput): Promise<OCRExtractorOutput> {
    // 1. 图像预处理（如果需要）
    const processedImage = input.options?.preprocess 
      ? await this.preprocess(input.image_path)
      : input.image_path;
    
    // 2. OCR识别
    const result = await this.ocrEngine.recognize(processedImage, {
      lang: input.language || 'chi_sim+eng'
    });
    
    return { text, confidence, regions, language };
  }
}
```

### 6.3 测试技术工具集

#### 6.3.1 等价类划分工具

```typescript
interface EquivalenceClassTool {
  name: 'generate_equivalence_classes';
  description: '为输入条件生成功能等价类';
  input: {
    condition: string;      // "用户名长度2-20字符"
    type: 'input' | 'output' | 'rule';
  };
  output: {
    valid_classes: EquivalenceClass[];   // 有效等价类
    invalid_classes: EquivalenceClass[]; // 无效等价类
    test_cases: TestCase[];              // 生成的测试用例
  };
}

// 示例输出
{
  valid_classes: [
    { id: 'EC1', range: '2-20 chars', description: '有效用户名长度' }
  ],
  invalid_classes: [
    { id: 'EC2', range: '< 2 chars', description: '用户名太短' },
    { id: 'EC3', range: '> 20 chars', description: '用户名太长' }
  ],
  test_cases: [
    { input: 'ab', expected: 'success', class: 'EC1' },
    { input: 'a', expected: 'error', class: 'EC2' }
  ]
}
```

#### 6.3.2 边界值分析工具

```typescript
interface BoundaryValueTool {
  name: 'generate_boundary_values';
  description: '为数值范围生成边界值测试用例';
  input: {
    min: number;
    max: number;
    type: 'integer' | 'float' | 'string_length';
    inclusive?: boolean;
  };
  output: {
    boundaries: Boundary[];      // 边界点
    test_values: TestValue[];    // 测试值 (min-1, min, min+1, ...)
    test_cases: TestCase[];
  };
}

// 示例: 输入范围 1-100
{
  boundaries: [
    { value: 1, type: 'min' },
    { value: 100, type: 'max' }
  ],
  test_values: [0, 1, 2, 99, 100, 101], // 边界值及其邻近值
  test_cases: [
    { input: 0, expected: 'invalid', boundary: 'min-1' },
    { input: 1, expected: 'valid', boundary: 'min' },
    { input: 2, expected: 'valid', boundary: 'min+1' }
  ]
}
```

#### 6.3.3 场景法工具

```typescript
interface ScenarioMethodTool {
  name: 'generate_scenarios';
  description: '基于用户故事生成测试场景';
  input: {
    user_story: string;       // "作为用户，我可以登录系统"
    actors: string[];         // ["用户", "系统"]
    preconditions: string[];  // 前置条件
  };
  output: {
    basic_flow: ScenarioStep[];      // 基本流
    alternative_flows: Scenario[][]; // 备选流
    exception_flows: Scenario[][];   // 异常流
    test_scenarios: TestScenario[];
  };
}
```

### 6.4 集成工具集

#### 6.4.1 Jira同步工具

```typescript
interface JiraSyncTool {
  name: 'sync_to_jira';
  description: '将问题同步到Jira';
  input: {
    issues: Issue[];
    project_key: string;
    issue_type?: 'Bug' | 'Task' | 'Story';
    mapping?: FieldMapping;
  };
  output: {
    created: JiraIssue[];
    updated: JiraIssue[];
    failed: FailedSync[];
    summary: SyncSummary;
  };
}
```

#### 6.4.2 TestRail导出工具

```typescript
interface TestRailExportTool {
  name: 'export_to_testrail';
  description: '将测试用例导出到TestRail';
  input: {
    test_cases: TestCase[];
    project_id: number;
    suite_id?: number;
    section_id?: number;
  };
  output: {
    exported: TestRailCase[];
    errors: ExportError[];
  };
}
```

---

## 📅 实施路线图

### Batch 6.1: MCP核心框架搭建 (2天)

| 任务 | 详细内容 | 验收标准 | 工期 |
|------|----------|----------|------|
| **6.1.1** | MCP Server基类 | 实现ToolRegistry、生命周期管理 | Server可启动，list_tools正常 | 1天 |
| **6.1.2** | MCP Client封装 | 实现Tool调用、错误处理、重试 | 调用成功率>95% | 1天 |
| **6.1.3** | 传输层实现 | stdio/http传输支持 | 双传输模式可用 | 1天 |

### Batch 6.2: 文档解析工具集 (3天)

| 任务 | 详细内容 | 验收标准 | 工期 |
|------|----------|----------|------|
| **6.2.1** | PDF解析工具 | 基于pdf-parse实现 | 解析准确率>95% | 1天 |
| **6.2.2** | DOCX解析工具 | 基于mammoth实现 | 保留层级结构 | 1天 |
| **6.2.3** | OCR识别工具 | 基于PaddleOCR实现 | 中文识别率>90% | 1天 |

### Batch 6.3: 测试技术工具集 (3天)

| 任务 | 详细内容 | 验收标准 | 工期 |
|------|----------|----------|------|
| **6.3.1** | 等价类划分 | 自动生成等价类和用例 | 覆盖所有输入类型 | 1天 |
| **6.3.2** | 边界值分析 | 自动生成边界测试值 | 包含边界±1 | 1天 |
| **6.3.3** | 场景法工具 | 基于用户故事生成场景 | 覆盖基本/备选/异常流 | 1天 |

### Batch 6.4: 集成工具集 (2天)

| 任务 | 详细内容 | 验收标准 | 工期 |
|------|----------|----------|------|
| **6.4.1** | Jira同步工具 | 实现问题同步 | 可创建/更新Issue | 1天 |
| **6.4.2** | TestRail导出 | 实现用例导出 | 可批量导出用例 | 1天 |

### Batch 6.5: 工具集成与测试 (2天)

| 任务 | 详细内容 | 验收标准 | 工期 |
|------|----------|----------|------|
| **6.5.1** | 工具集成测试 | 端到端测试所有工具 | 所有工具通过测试 | 1天 |
| **6.5.2** | 性能优化 | 工具响应优化 | 平均响应<500ms | 1天 |
| **6.5.3** | 文档更新 | 更新KIMI.md、使用指南 | 文档通过review | 1天 |

---

## ✅ Phase 6 检查点

- [ ] MCP Server框架可用
- [ ] PDF/DOCX/OCR解析工具可用
- [ ] 等价类/边界值/场景法工具可用
- [ ] Jira/TestRail集成工具可用
- [ ] 工具调用成功率>95%
- [ ] 平均响应时间<500ms
- [ ] 测试覆盖率>80%

---

## 📊 成功指标

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|----------|
| MCP工具数量 | 2 | 10+ | 统计 |
| 工具调用成功率 | 60% | 95% | 监控 |
| 平均响应时间 | 2s | 500ms | 监控 |
| 代码覆盖率 | - | 80% | Jest |

---

**文档结束**

> 🚀 **下一步**: 执行Batch 6.1 - MCP核心框架搭建
