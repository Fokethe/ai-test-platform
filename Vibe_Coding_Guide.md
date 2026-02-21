# Vibe Coding 实战指南：从屎山到系统

> **核心原则**：AI 负责打字，你负责思考。

![Vibe Coding 核心工作流](sandbox:///mnt/kimi/output/vibe_coding_workflow.png)

---

## 一、为什么你失败了？

**根本原因**：不是 AI 能力差，而是你的意图模糊。

- AI 是**翻译器**：意图清晰 → 代码清晰；意图模糊 → AI 猜测 → 混乱叠加
- **解决方案**：更好的理解 → 更好的提示词自然流露
- **黄金法则**：先写文档，再写代码

---

## 二、文档优先系统（6+2 架构）

![6+2 文档系统架构](sandbox:///mnt/kimi/output/documentation_system.png)

### 六份规范文档（知识库）

| 文档 | 作用 | 关键内容 |
|------|------|----------|
| **PRD.md** | 产品需求 | 功能规格、用户故事、成功标准、非目标 |
| **APP_FLOW.md** | 用户流程 | 页面导航、决策点、错误处理 |
| **TECH_STACK.md** | 技术栈 | 依赖版本锁定（消除歧义） |
| **FRONTEND_GUIDELINES.md** | 前端规范 | 设计系统：颜色、字体、间距、组件 |
| **BACKEND_STRUCTURE.md** | 后端结构 | 数据库模式、API 端点、认证逻辑 |
| **IMPLEMENTATION_PLAN.md** | 实施计划 | 逐步构建顺序（步骤越细越好） |

### 两份会话文件（持久层）

| 文件 | 作用 | 更新频率 |
|------|------|----------|
| **CLAUDE.md** | AI 操作手册（自动读取） | 每次纠正后更新 |
| **progress.txt** | 进度追踪、跨会话记忆 | 每个功能后更新 |
| **lessons.md** | 错误模式、自我改进 | 每次 Debug 后更新 |

> **关键认知**：AI 在会话间没有记忆，`progress.txt` 是你的外部记忆桥梁。

---

## 三、审问系统（Interrogation）

**在写代码前，让 AI 把你的想法"撕碎"**。

### 核心提示词

```
在写任何代码之前，在 Planning 模式下无尽地审问我的想法。
不要假设任何问题。问问题直到没有假设剩下。
```

### 审问维度

- 目标用户是谁？
- 核心行动是什么？
- 之后发生什么？
- 需要保存/展示什么数据？
- 错误/成功状态如何处理？
- 是否需要登录/数据库/移动端适配？

**流程**：审问 → 文档 → 代码（永远别跳过）

---

## 四、AI 工具选择指南

![AI 工具选择决策指南](sandbox:///mnt/kimi/output/tool_selection_guide.png)

### 工具分工矩阵

| 工具 | 最佳场景 | 核心能力 |
|------|----------|----------|
| **Claude** | 需求分析、写文档、审问 | 深度思考、长文本生成 |
| **Cursor** | 日常编码、多文件编辑 | Ask → Plan → Agent → Debug 四模式 |
| **Kimi K2.5** | 视觉还原、UI 实现 | 多模态（截图 → 代码） |
| **Codex** | Bug 修复、代码审查 | 跨文件追踪、并行处理 |
| **Vercel** | 部署托管 | 自动构建、环境变量管理 |

### Cursor 四模式工作流

```
Ask（理解代码）→ Plan（架构设计）→ Agent（自动编码）→ 
（遇到 Bug？）→ Debug（错误修复）→ Agent（继续编码）
```

---

## 五、核心概念速查

### UI 设计风格词汇

| 风格 | 关键词 | 适用场景 |
|------|--------|----------|
| **Glassmorphism** | 磨砂玻璃、背景模糊 | 卡片、导航栏、仪表盘 |
| **Neobrutalism** | 厚边框、高对比度、原色 | 创意品牌、独立工具 |
| **Bento Grid** | 模块化网格、不同尺寸卡片 | 仪表盘、产品页 |
| **Dark Mode** | 深色背景、浅色文字 | 消费级 App 必备 |
| **Micro-interactions** | 悬停缩放、点击反馈 | 提升质感的关键 |

### 技术基础概念

- **组件**：可复用的界面片段（乐高积木思维）
- **State（状态）**：变化的数据（菜单开关、登录状态）
- **Responsive**：响应式设计（Mobile-first：0-640px/640-1024px/1024px+）
- **API**：系统间通信（GET/POST/PUT/DELETE）
- **Authentication**：认证（用 Clerk/Supabase Auth，**不要自己造**）

---

## 六、项目结构模板

```
my-app/
├── src/
│   ├── app/              → 页面和路由
│   ├── components/       → 可复用 UI
│   ├── lib/              → 工具函数
│   └── styles/           → CSS
├── public/               → 静态资源
├── .env                  → 密钥（永不提交）
├── CLAUDE.md             → AI 规则
├── progress.txt          → 进度追踪
├── PRD.md                → 产品需求
├── APP_FLOW.md           → 用户流程
├── TECH_STACK.md         → 技术栈
├── FRONTEND_GUIDELINES.md → 设计系统
├── BACKEND_STRUCTURE.md  → 数据库规格
└── IMPLEMENTATION_PLAN.md → 实施计划
```

---

## 七、开发 checklist

### 编码前
- [ ] 运行审问提示词，回答所有问题
- [ ] 生成 6 份规范文档
- [ ] 创建 CLAUDE.md、progress.txt
- [ ] 收集 UI 参考截图
- [ ] 初始化 git

### 编码中
- [ ] AI 每次会话先读取 CLAUDE.md + progress.txt
- [ ] 小步快跑，一次一个功能
- [ ] 引用规范文档（"按照 PRD.md 第 3 节..."）
- [ ] 每个功能后：提交代码 + 更新 progress.txt
- [ ] 手机端测试

### 发布前
- [ ] 手机端测试
- [ ] 空状态/错误状态处理
- [ ] 慢网速加载状态
- [ ] 密钥检查（不在前端暴露）
- [ ] Vercel 环境变量配置

---

## 八、关键提示词模板

### 1. 审问阶段
```
在写任何代码之前，在 Planning 模式下无尽地审问我的想法。
不要假设任何问题。问问题直到没有假设剩下。
```

### 2. 生成文档
```
基于我们的审问，生成规范文档：
PRD.md、APP_FLOW.md、TECH_STACK.md、
FRONTEND_GUIDELINES.md、BACKEND_STRUCTURE.md、IMPLEMENTATION_PLAN.md。
用对话中的答案作为素材。要具体且详尽。
```

### 3. 编码指令
```
首先读取 CLAUDE.md 和 progress.txt。
然后构建 IMPLEMENTATION_PLAN.md 的步骤 4.2。
登录流程在 APP_FLOW.md 第 3 节定义。
使用 BACKEND_STRUCTURE.md 第 5 节的认证设置。
按照 FRONTEND_GUIDELINES.md 样式化一切。
```

### 4. Debug 指令
```
我得到这个错误：[完整错误信息]
这是相关代码：[代码片段]
这是期望行为：[描述]
```

---

## 九、安全红线

| 绝对禁止 | 正确做法 |
|----------|----------|
| 在 `.env` 中存放密钥并提交到 git | 添加到 `.gitignore`，Vercel 后台配置 |
| 在前端代码暴露 API 密钥 | 只在后端使用，前端通过 API 路由调用 |
| 截图包含 `.env` 内容 | 打码或隐藏后再分享 |
| 自己实现密码加密/认证逻辑 | 使用 Clerk、Supabase Auth 等服务 |

---

## 十、一句话总结

> ** specificity（具体性）不是额外工作，它就是工作。**
> 
> 你预先定义的越多，后来调试的越少。
> 
> **AI 负责打字，你负责思考。**

---

## 参考资源

- 原文：[Why you suck at vibe coding](https://mp.weixin.qq.com/s/xQvSuhGXvawPsW_cWXxnbA)
- 工具：Cursor、Claude、Kimi K2.5、Codex、Vercel
- 组件库：shadcn/ui、Lucide React
- 服务：Supabase、Clerk、Stripe

---

*生成时间：2026-02-13 | 基于万字长文精简提炼*
