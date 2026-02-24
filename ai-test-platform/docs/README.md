# AI Test Platform - 文档中心

> 基于 Kimi Code 规范的简化文档体系
> 最后更新: 2026-02-24

---

## 📁 文档结构（Kimi Code 1+1 规范）

```
docs/
├── KIMI.md          # ⭐ AI操作手册（每次会话先读）
├── progress.txt     # ⭐ 进度追踪（对话锚点）
├── PRD.md           # 产品需求文档
├── GUIDE.md         # 快速入门指南
├── PROMPTS.md       # Prompt模板库
├── CLAUDE.md        # AI协作手册（面向0代码用户）
├── testcases.md     # 测试用例集
└── README.md        # 本文档（总览）
```

---

## 🚀 快速导航

### 首次使用

1. 📖 阅读 [GUIDE.md](./GUIDE.md) - 快速入门
2. ⭐ 阅读 [KIMI.md](./KIMI.md) - 了解项目规范
3. 📋 查看 [progress.txt](./progress.txt) - 了解当前进度

### 开发工作

- 📝 查阅 [PRD.md](./PRD.md) - 产品需求
- 🤖 查阅 [PROMPTS.md](./PROMPTS.md) - Prompt模板
- 👥 查阅 [CLAUDE.md](./CLAUDE.md) - AI协作手册（0代码用户）
- 🧪 查阅 [testcases.md](./testcases.md) - 测试用例

---

## 📋 文档说明

### 核心文档（1+1系统）

| 文档             | 用途                     | 更新频率   |
| ---------------- | ------------------------ | ---------- |
| **KIMI.md**      | AI操作手册，记录技术规范 | 规范变更时 |
| **progress.txt** | 进度追踪，对话锚点       | 每次会话后 |

### 辅助文档

| 文档         | 用途                           |
| ------------ | ------------------------------ |
| PRD.md       | 产品需求文档（合并所有PRD）    |
| PROMPTS.md   | Prompt模板库（10个常用模板）   |
| GUIDE.md     | 快速入门指南（启动/验证/排查） |
| CLAUDE.md    | AI协作手册（面向0代码用户）    |
| testcases.md | 测试用例集（认证模块等）       |

---

## � 使用规范

### 每次新会话开场白

```
读取 KIMI.md 和 progress.txt。

本次目标：[具体功能]

请确认当前状态后开始。
```

### 文档更新原则

1. **KIMI.md** - 技术规范变更时更新
2. **progress.txt** - 每次会话后更新
3. **PRD.md** - 需求变更时更新
4. **PROMPTS.md** - 新增Prompt模板时更新

---

## �🗑️ 已清理文档

本次整理已删除以下重复/多余文档：

- ❌ 所有子文件夹（10-AUX/, DEV/, PRD/, PROMPT/, TEST/）
- ❌ DOCUMENT_NAMING_CONVENTION.md - 过于复杂的命名规范
- ❌ PROGRESS\_跨会话记忆.md - 合并到 progress.txt
- ❌ TASK_TRACKING.md - 合并到 progress.txt
- ❌ ATP-PRD-001~006 - 合并到 PRD.md
- ❌ ATP-PROMPT-001~006 - 合并到 PROMPTS.md
- ❌ ATP-GUIDE-001~003 - 合并到 GUIDE.md
- ❌ 4个TEST规范文档 - 过于繁琐，保留核心测试用例

---

**文档版本**: v3.0（Kimi Code 1+1 规范）  
**最后更新**: 2026-02-24  
**维护者**: AI Test Platform Team
