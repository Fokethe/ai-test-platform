# MCP Tool Usage Guide

**Version**: v1.0
**Last Updated**: 2026-03-10
**For**: AI Test Platform Phase 6

---

## Quick Start

### Install Dependencies

```bash
npm install pdf-parse mammoth tesseract.js
npm install -D @types/pdf-parse
```

### Basic Usage

```typescript
import { MCPClient } from "@/lib/mcp/client";

const client = new MCPClient();
await client.connect();

const tools = await client.listTools();

const result = await client.callTool("parse_pdf", {
  file_path: "/path/to/requirements.pdf"
});
```

---

## Tool List

| Category | Tool Name | Description | Use Case |
|---------|----------|-------------|----------|
| Document | parse_pdf | Parse PDF documents | Extract requirements |
| Document | parse_docx | Parse Word documents | Extract test plans |
| Document | extract_ocr | OCR image recognition | Screenshot analysis |
| Testing | generate_equivalence_classes | Equivalence partitioning | Input validation |
| Testing | generate_boundary_values | Boundary value analysis | Range testing |
| Testing | generate_scenarios | Scenario generation | Business flow testing |
| Integration | sync_to_jira | Sync to Jira | Issue tracking |
| Integration | export_to_testrail | Export to TestRail | Test case management |
| Integration | send_webhook | Webhook notification | CI/CD integration |

---

## Document Tools

### parse_pdf

**Description**: Parse PDF documents, extract text, tables and metadata

**Input**:
```typescript
{
  file_path: string;
  options?: {
    extract_tables?: boolean;
    extract_metadata?: boolean;
  }
}
```

**Example**:
```typescript
const result = await client.callTool("parse_pdf", {
  file_path: "./docs/requirements.pdf",
  options: {
    extract_tables: true,
    extract_metadata: true
  }
});

const requirements = result.data.text;
```

---

### parse_docx

**Description**: Parse Word documents with structured content

**Input**:
```typescript
{
  file_path: string;
  options?: {
    extract_headings?: boolean;
    extract_tables?: boolean;
  }
}
```

---

### extract_ocr

**Description**: Extract text from images, supports Chinese and English

**Input**:
```typescript
{
  image_path: string;
  options?: {
    language?: string; // chi_sim | eng | chi_sim+eng
    enhance?: boolean;
  }
}
```

---

## Testing Tools

### generate_equivalence_classes

**Description**: Auto-generate equivalence classes for input conditions

**Example**:
```typescript
const result = await client.callTool("generate_equivalence_classes", {
  input_spec: {
    name: "username",
    type: "string",
    constraints: {
      min: 2,
      max: 20,
      pattern: "[a-zA-Z0-9]+$"
    }
  }
});

console.log("Valid classes:", result.data.valid_classes);
console.log("Test cases:", result.data.test_cases);
```

---

### generate_boundary_values

**Description**: Generate standard BVA test values for ranges

**Example**:
```typescript
const result = await client.callTool("generate_boundary_values", {
  range: {
    min: 18,
    max: 65,
    type: "integer",
    inclusive: true
  }
});

// Output: [17, 18, 19, 41, 64, 65, 66]
console.log("Boundary values:", result.data.test_values);
```

---

### generate_scenarios

**Description**: Generate test scenarios from user stories

**Example**:
```typescript
const result = await client.callTool("generate_scenarios", {
  user_story: "As a user, I can pay orders with bank card",
  context: {
    preconditions: ["User logged in", "Order created"],
    actors: ["User", "Payment system"],
    business_rules: ["Sufficient balance required"]
  }
});

console.log("Basic flow:", result.data.basic_flow);
console.log("Alternative flows:", result.data.alternative_flows);
console.log("Exception flows:", result.data.exception_flows);
```

---

## Integration Tools

### sync_to_jira

**Description**: Sync test issues to Jira

**Example**:
```typescript
const result = await client.callTool("sync_to_jira", {
  issues: [{
    title: "Login button not responding",
    description: "Clicking login button has no effect in Chrome",
    type: "Bug",
    priority: "High"
  }],
  config: {
    project_key: "TEST",
    base_url: process.env.JIRA_BASE_URL,
    auth: { type: "token", token: process.env.JIRA_TOKEN }
  }
});
```

**Environment Variables**:
```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_TOKEN=your-api-token
```

---

### send_webhook

**Description**: Send webhook notifications to Feishu/DingTalk/WeCom

**Example**:
```typescript
// Feishu notification
await client.callTool("send_webhook", {
  platform: "feishu",
  webhook_url: process.env.FEISHU_WEBHOOK_URL,
  message: {
    type: "text",
    content: "Test execution completed: 50 passed, 2 failed"
  }
});

// DingTalk markdown notification
await client.callTool("send_webhook", {
  platform: "dingtalk",
  webhook_url: process.env.DINGTALK_WEBHOOK_URL,
  message: {
    type: "markdown",
    title: "Test Report",
    content: { text: "**Test Completed**\n- Passed: 50\n- Failed: 2" }
  },
  options: { secret: process.env.DINGTALK_SECRET }
});
```

---

## Configuration

### Environment Variables

Create `.env.local` in project root:

```bash
# Jira
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_TOKEN=your-token

# TestRail
TESTRAIL_BASE_URL=https://your-domain.testrail.io
TESTRAIL_USER=your-email
TESTRAIL_PASS=your-password

# Webhook
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=your-secret
```

---

## Troubleshooting

### Common Issues

1. **PDF parsing fails**: Check file exists and is not a scanned image
2. **OCR low accuracy**: Enable enhance: true, ensure sufficient image resolution
3. **Webhook fails**: Check URL and signature secret
4. **Jira sync fails**: Verify token permissions and project key

---

**Document End**
