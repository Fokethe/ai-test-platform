# 前端大重构计划 v2.0 - 飞书+Bento融合风格

## 设计理念

### 风格融合：「科技简洁主义」
将 **飞书的简洁高效** 与 **Bento Grid的科技感** 融合，打造既专业又易用的AI测试平台。

| 飞书风格 | Bento风格 | 融合方案 |
|---------|----------|---------|
| 极简侧边栏 | 科技网格 | 扁平极简导航 + 电光蓝高亮 |
| 中央工作区 | Bento卡片 | 大面积留白 + 霓虹光效卡片 |
| 圆角柔和 | 锐利科技 | 12px圆角 + 电光蓝边框 |
| 白色为主 | 深色科技 | 浅色主题 + 科技蓝强调 |

---

## 一、核心工作流（P0优先级）

### 1.1 工作台（飞书首页风格+Bento卡片）
**页面**：`/dashboard`（保留现有，优化增强）

**布局结构**：
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (飞书极简风格)    │  Main Content (Bento Grid) │
│                            │                            │
│  🤖 AI测试平台              │  ┌──────────────────────┐ │
│                            │  │   智能对话入口        │ │
│  🏠 工作台                  │  │   (飞书中央输入框)    │ │
│  📁 项目管理 (P0)           │  └──────────────────────┘ │
│  📝 需求管理                │                            │
│  🧪 测试设计                │  ┌──────────┐ ┌──────────┐│
│  ▶️ 测试执行                │  │ 快速开始 │ │ 最近动态 ││
│  🐛 缺陷管理                │  │  Bento   │ │  Bento   ││
│  📊 报告中心                │  └──────────┘ └──────────┘│
│  📚 知识库                  │                            │
│                            │  ┌──────────┐ ┌──────────┐│
│  ⚙️ 设置                    │  │ 执行统计 │ │ AI助手   ││
│                            │  │  Bento   │ │  Bento   ││
│                            │  └──────────┘ └──────────┘│
└─────────────────────────────────────────────────────────┘
```

**核心组件**：
- **智能对话入口**：底部悬浮或中央大输入框，支持自然语言
  - "帮我生成登录功能的测试用例"
  - "查询项目A的最新执行结果"
  - "分析最近一周的测试覆盖率"
- **快速开始卡片**：Bento风格，2×2网格，快捷入口
  - 新建需求 | 新建用例 | 执行测试 | 查看报告
- **最近动态卡片**：Bento风格，时间线展示

---

### 1.2 项目管理（P0-新增模块）
**页面**：`/projects`

**功能**：
- 项目列表（飞书风格简洁表格）
- 项目创建（Bento卡片表单）
- 项目详情（Bento Grid布局）
  - 基本信息卡片
  - 成员管理卡片
  - 统计概览卡片
  - 最近活动卡片

**数据库模型**：
```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  ownerId     String
  members     ProjectMember[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProjectMember {
  id        String @id @default(cuid())
  projectId String
  userId    String
  role      ProjectRole @default(MEMBER)
}
```

---

### 1.3 需求管理（工作流起点）
**页面**：`/requirements`

**布局**：
- 左侧：需求列表（飞书风格）
- 右侧：需求详情/AI生成面板（Bento卡片）

**状态流转**：
```
草稿 → 评审中 → 已批准 → 已实现 → 已测试
  ↓
已拒绝
```

**AI生成入口**：
- 对话框式输入："基于用户登录功能生成测试需求"
- 支持上传文档（PDF/Word）
- 生成结果预览和编辑

---

### 1.4 测试设计
**页面**：`/tests`（保留现有，优化交互）

**优化点**：
- 保留Bento Grid卡片风格
- 添加飞书风格的筛选栏
- 用例详情页（新增）：
  - 基本信息卡片
  - 测试步骤卡片
  - 执行历史卡片
  - 关联需求卡片

---

### 1.5 测试执行
**页面**：`/runs` → `/executions`（重命名）

**优化点**：
- 统一名称为"测试执行"
- 执行详情页（新增）：
  - 实时执行状态（科技感动画）
  - 执行日志（类似飞书消息流）
  - 结果统计（Bento卡片）

---

### 1.6 知识库（原资产库，RAG集成P0）
**页面**：`/knowledge`

**飞书风格布局**：
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar                    │  Main Content             │
│                             │                            │
│  📚 知识库                   │  ┌──────────────────────┐ │
│                             │  │   搜索框              │ │
│  📁 个人知识库               │  └──────────────────────┘ │
│  📁 共享知识库               │                            │
│     ├── 团队文档             │  ┌──────────┐ ┌──────────┐│
│     ├── API文档              │  │ 最近上传 │ │ RAG状态  ││
│     └── 测试规范             │  └──────────┘ └──────────┘│
│                             │                            │
│  ➕ 新建知识库               │  ┌──────────────────────┐ │
│                             │  │    文档列表            │ │
│                             │  │   (飞书风格)          │ │
│                             │  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**RAG功能**：
- 文档上传和解析
- 向量索引状态显示
- 智能问答（集成到全局智能对话）

---

## 二、设计系统规范

### 2.1 色彩系统
```css
/* 主色 */
--electric: #0066ff;        /* 电光蓝 - 强调色 */
--neon: #00d4ff;            /* 霓虹青 - 高亮 */

/* 飞书风格基础色 */
--background: #ffffff;      /* 纯白背景 */
--surface: #f5f6f7;         /* 卡片背景 */
--border: #e4e6e8;          /* 边框 */
--text-primary: #1f2329;    /* 主文字 */
--text-secondary: #8f959e;  /* 次要文字 */

/* 功能色 */
--success: #34d399;         /* 成功绿 */
--warning: #fbbf24;         /* 警告黄 */
--error: #f87171;           /* 错误红 */
```

### 2.2 圆角系统
```css
--radius-sm: 6px;           /* 小按钮 */
--radius-md: 8px;           /* 输入框 */
--radius-lg: 12px;          /* 卡片 - 飞书风格 */
--radius-xl: 16px;          /* 大卡片 - Bento风格 */
--radius-full: 9999px;      /* 完全圆角 */
```

### 2.3 阴影系统
```css
/* 飞书风格柔和阴影 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

/* Bento风格科技光晕 */
--glow-electric: 0 0 20px rgba(0,102,255,0.3);
--glow-neon: 0 0 20px rgba(0,212,255,0.3);
```

### 2.4 组件规范

#### 侧边栏（飞书极简风格）
```typescript
interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  activeId: string;
}

// 样式特点
// - 宽度: 240px (展开) / 64px (收起)
// - 背景: 白色/浅灰
// - 图标: 20px，线性风格
// - 选中: 电光蓝高亮 + 左侧竖线
// - hover: 浅灰背景
```

#### Bento卡片（科技简洁版）
```typescript
interface BentoCardProps {
  variant: 'default' | 'featured' | 'glass';
  padding?: 'sm' | 'md' | 'lg';
  glow?: boolean;           // 霓虹光效
  hoverEffect?: boolean;    // 悬浮效果
}

// 样式特点
// - 圆角: 12-16px
// - 背景: 白色 + 细微阴影
// - featured: 电光蓝渐变边框
// - glass: 毛玻璃效果 + 霓虹光晕
```

#### 智能对话输入框
```typescript
interface SmartInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
  suggestions?: string[];
  attachments?: boolean;
}

// 样式特点（飞书风格）
// - 圆角: 24px（超大圆角）
// - 背景: 浅灰
// - 聚焦: 电光蓝边框
// - 附件按钮: 左侧
// - 发送按钮: 右侧圆形
```

---

## 三、智能对话系统（全局AI入口）

### 3.1 功能设计
- **位置**：底部悬浮栏 / 快捷键唤起
- **输入方式**：自然语言 / 语音 / 附件
- **上下文感知**：根据当前页面推荐操作

### 3.2 支持的指令
| 指令类型 | 示例 | 执行动作 |
|---------|------|---------|
| 生成类 | "生成登录功能的测试用例" | 调用AI生成，跳转到测试设计 |
| 查询类 | "查询项目A的最新执行结果" | 显示执行报告卡片 |
| 分析类 | "分析最近一周的测试覆盖率" | 生成统计图表 |
| 操作类 | "执行所有高优先级用例" | 启动测试执行 |
| 知识类 | "搜索关于用户认证的文档" | RAG检索，显示结果 |

### 3.3 交互流程
```
用户输入 → 意图识别 → 参数提取 → 执行动作 → 结果展示
                ↓
         无法识别 → 友好提示 + 建议指令
```

---

## 四、实施计划（12天）

### Phase 1: 核心框架与导航（3天）
| 天数 | 任务 | 产出 |
|------|------|------|
| Day 1 | 设计系统更新 + 侧边栏重构 | 新导航组件 |
| Day 2 | 工作台页面重构 | 智能对话入口 + Bento卡片 |
| Day 3 | 数据库模型 + API设计 | Project模型 + API端点 |

### Phase 2: 工作流页面（5天）
| 天数 | 任务 | 产出 |
|------|------|------|
| Day 4 | 项目管理模块 | 项目列表 + 详情页 |
| Day 5 | 需求管理模块 | 需求列表 + AI生成 |
| Day 6 | 测试设计优化 | 用例详情页 |
| Day 7 | 测试执行优化 | 执行详情页 |
| Day 8 | 智能对话系统 | 全局AI入口 |

### Phase 3: 知识库与质量（3天）
| 天数 | 任务 | 产出 |
|------|------|------|
| Day 9 | 知识库重构（飞书风格） | 文档管理 + RAG集成 |
| Day 10 | 缺陷管理重构 | 问题列表 + 详情页 |
| Day 11 | 报告中心重构 | 统计报表 + 可视化 |

### Phase 4: 优化与测试（1天）
| 天数 | 任务 | 产出 |
|------|------|------|
| Day 12 | 整体测试 + 细节优化 | 完整重构系统 |

---

## 五、数据库模型调整

### 5.1 新增模型

```prisma
// 项目管理
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  ownerId     String
  members     ProjectMember[]
  requirements Requirement[]
  testCases   TestCase[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProjectMember {
  id        String @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  userId    String
  role      ProjectRole @default(MEMBER)
  createdAt DateTime @default(now())
}

// 需求管理
model Requirement {
  id          String @id @default(cuid())
  projectId   String
  project     Project @relation(fields: [projectId], references: [id])
  title       String
  description String?
  status      RequirementStatus @default(DRAFT)
  priority    Priority @default(MEDIUM)
  testCases   TestCase[]
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 知识库文档
model KnowledgeDoc {
  id          String @id @default(cuid())
  title       String
  content     String?
  fileUrl     String?
  type        DocType @default(DOCUMENT)
  scope       DocScope @default(PERSONAL)
  status      IndexStatus @default(PENDING)
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 5.2 模型调整

```prisma
// TestCase 添加需求关联
model TestCase {
  // ... existing fields
  requirementId String?
  requirement   Requirement? @relation(fields: [requirementId], references: [id])
  projectId     String?
  project       Project? @relation(fields: [projectId], references: [id])
}
```

---

## 六、API设计

### 6.1 新增端点

```typescript
// 项目管理
GET    /api/projects              // 项目列表
POST   /api/projects              // 创建项目
GET    /api/projects/:id          // 项目详情
PUT    /api/projects/:id          // 更新项目
DELETE /api/projects/:id          // 删除项目
GET    /api/projects/:id/members  // 成员列表
POST   /api/projects/:id/members  // 添加成员

// 需求管理
GET    /api/requirements          // 需求列表
POST   /api/requirements          // 创建需求
POST   /api/requirements/ai       // AI生成需求
GET    /api/requirements/:id      // 需求详情
PUT    /api/requirements/:id      // 更新需求

// 智能对话
POST   /api/ai/chat               // 智能对话
POST   /api/ai/intent             // 意图识别

// 知识库
GET    /api/knowledge             // 文档列表
POST   /api/knowledge             // 上传文档
POST   /api/knowledge/:id/index   // 触发索引
GET    /api/knowledge/search      // RAG搜索
```

---

## 七、验收标准

### 7.1 功能验收
- [ ] 工作台展示智能对话入口
- [ ] 项目管理完整CRUD
- [ ] 需求管理工作流（草稿→已测试）
- [ ] 测试用例关联需求
- [ ] 知识库RAG功能正常
- [ ] 智能对话支持所有指令类型

### 7.2 视觉验收
- [ ] 侧边栏符合飞书极简风格
- [ ] Bento卡片保留科技光效
- [ ] 整体配色协调（白+电光蓝）
- [ ] 圆角统一（12-16px）

### 7.3 体验验收
- [ ] 核心工作流点击数 ≤ 5次
- [ ] 智能对话响应时间 ≤ 2秒
- [ ] 页面加载时间 ≤ 2秒
- [ ] 移动端适配正常

---

*计划版本: v2.0*
*创建时间: 2026-03-16*
*风格: 飞书简洁 + Bento科技*
