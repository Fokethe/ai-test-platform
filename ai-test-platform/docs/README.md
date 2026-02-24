# AI Test Platform - 文档中心

> 基于 Kimi Code 规范的简化文档体系
> 最后更新: 2026-02-24

---

## 📁 文档目录 (共 22 篇)

```
docs/
├── README.md                          # 本文档（总览）
├── DOCUMENT_NAMING_CONVENTION.md      # 文档命名规范
├── PROGRESS_跨会话记忆.md              # 对话历史记录
├── TASK_TRACKING.md                   # 任务追踪看板
│
├── PRD/                               # 产品需求文档 (3篇)
│   ├── ATP-PRD-001-产品需求文档-v1.0.md
│   ├── ATP-PRD-002-用户旅程文档-v1.0.md
│   └── ATP-PRD-003-仪表盘功能需求-v1.0.md  ✅ 新增
│
├── DEV/                               # 开发文档 (2篇)
│   ├── ATP-DEV-001-开发指南-v1.0.md
│   └── ATP-DEV-002-代码质量报告-v1.0.md    ✅ 新增
│
├── TEST/                              # 测试文档 (6篇)
│   ├── standards/                     # 测试规范 (4篇)
│   │   ├── ATP-STD-001-测试计划规范-v1.0.md
│   │   ├── ATP-STD-002-测试用例规范-v1.0.md
│   │   ├── ATP-STD-003-问题报告规范-v1.0.md
│   │   └── ATP-STD-004-测试报告规范-v1.0.md
│   └── testcases/                     # 测试用例示例 (1篇)
│       └── ATP-TC-001-认证模块测试用例-v1.0.md
│
├── PROMPT/                            # AI Prompt 库 (6篇)
│   ├── ATP-PROMPT-001-新功能开发Prompt-v1.0.md
│   ├── ATP-PROMPT-002-手动测试Prompt-v1.0.md
│   ├── ATP-PROMPT-003-问题排查Prompt-v1.0.md
│   ├── ATP-PROMPT-004-代码审查Prompt-v1.0.md
│   ├── ATP-PROMPT-005-开发Prompt汇总-v1.0.md
│   └── ATP-PROMPT-006-测试Prompt汇总-v1.0.md
│
└── AUX/                               # 辅助文档 (5篇)
    ├── CLAUDE.md                      # AI 协作手册
    ├── ATP-GUIDE-001-快速开始-v1.0.md
    ├── ATP-GUIDE-002-功能验证-v1.0.md
    ├── ATP-GUIDE-003-迁移指南-v1.0.md
    └── ATP-AUX-011-系统架构说明-v1.0.md
```

---

## 🚀 快速导航

### 首次使用

1. 📖 阅读 [快速开始指南](./AUX/ATP-GUIDE-001-快速开始-v1.0.md)
2. ✅ 完成 [功能验证](./AUX/ATP-GUIDE-002-功能验证-v1.0.md)
3. 📚 查阅 [测试规范](./TEST/standards/)

### 角色指南

| 角色         | 推荐文档                                             |
| ------------ | ---------------------------------------------------- |
| **产品经理** | [PRD/产品需求文档](./PRD/)                           |
| **开发人员** | [DEV/开发指南](./DEV/)、[CLAUDE.md](./AUX/CLAUDE.md) |
| **测试人员** | [TEST/测试规范](./TEST/standards/)                   |
| **AI 辅助**  | [PROMPT/AI Prompt库](./PROMPT/)                      |

---

## 📝 文档命名规范

```
ATP-[类型]-[序号]-[描述]-v[版本号].md
```

| 类型   | 说明         | 示例                                    |
| ------ | ------------ | --------------------------------------- |
| PRD    | 产品需求文档 | ATP-PRD-001-产品需求文档-v1.0.md        |
| DEV    | 开发文档     | ATP-DEV-001-开发指南-v1.0.md            |
| STD    | 规范标准     | ATP-STD-001-测试计划规范-v1.0.md        |
| TC     | 测试用例     | ATP-TC-001-认证模块测试用例-v1.0.md     |
| PROMPT | AI Prompt    | ATP-PROMPT-001-新功能开发Prompt-v1.0.md |
| GUIDE  | 用户指南     | ATP-GUIDE-001-快速开始-v1.0.md          |
| AUX    | 辅助文档     | ATP-AUX-011-系统架构说明-v1.0.md        |

---

## 🗑️ 清理记录

本次清理共删除以下类型文档：

- ❌ 临时总结报告（功能完成报告、测试总结等）
- ❌ 问题追踪报告（已修复问题的历史记录）
- ❌ 回归测试执行指南（一次性文档）
- ❌ Git 推送日志（自动生成，无需保留）
- ❌ 重复的功能验证清单
- ❌ 空的 README 索引文档

---

## 🆕 新增记录 (2026-02-17)

### 新增文档

- ✅ ATP-PRD-003-仪表盘功能需求-v1.0.md
- ✅ ATP-DEV-002-代码质量报告-v1.0.md
- ✅ PROGRESS\_跨会话记忆.md
- ✅ TASK_TRACKING.md

### 新增API

- ✅ GET /api/dashboard - 仪表盘数据聚合

### 新增页面

- ✅ /dashboard - 统一仪表盘

---

**最后更新**: 2026-02-17  
**文档版本**: v1.2  
**维护者**: AI Test Platform Team
