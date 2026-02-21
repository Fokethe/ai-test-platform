# AI Test Platform - 跨会话记忆文档

> 记录所有对话历史、问题追踪、开发决策和上下文信息
> 创建时间: 2026-02-17
> 最后更新: 2026-02-17

---

## 一、项目背景

### 1.1 项目概述
- **项目名称**: AI Test Platform（智能测试平台）
- **技术栈**: Next.js 16.1.6 + Prisma + SQLite + Tailwind CSS + shadcn/ui
- **核心定位**: 零代码友好的 AI 辅助测试平台
- **服务地址**: http://localhost:3000

### 1.2 初始状态（第一次会话）
- 基础项目框架已搭建
- 数据库模型已定义（Workspace/Project/System/Page/TestCase层级）
- 认证系统（NextAuth）已集成
- 基础CRUD功能存在但不够完善

---

## 二、问题追踪历史

### 2.1 问题清单汇总（共14项）

#### ✅ 已修复/改进（6项）

| # | 问题 | 修复方案 | 状态 |
|---|------|----------|------|
| 1 | 知识库 tags 报错 `slice(...).map is not a function` | tags字符串转数组处理 | ✅ |
| 2 | 名称过长超出UI边界 | 添加`truncate`样式 | ✅ |
| 3 | AI生成页面无法检索项目/系统/页面 | 创建3个API端点 | ✅ |
| 4 | AI生成不智能，固定3条用例 | 支持温度参数，智能提取关键词 | ✅ |
| 5 | 用例库导入无法选择页面 | 改为层级选择模式 | ✅ |
| 8 | 用户管理权限问题 | 侧边栏条件改为检查`role === 'ADMIN'` | ✅ |
| 11 | 系统配置权限问题 | 角色判断`'admin'`→`'ADMIN'` | ✅ |

#### ⏸️ 暂不修复（1项）

| # | 问题 | 原因 |
|---|------|------|
| 6 | 用例库页面`pagesLoading is not defined` | 用户明确暂不修复 |

#### 📝 待办需求（7项）

| # | 需求 | 优先级 | 说明 |
|---|------|--------|------|
| 7 | 仪表盘功能 | 🟠 中 | 整合执行中心+报告中心数据 |
| 9 | UI布局优化 | 🟡 低 | 底部功能区移至右上角 |
| 10 | 定时执行功能 | 🟠 中 | 集成到测试套件模块 |
| 12 | 日志功能 | 🟡 中 | 操作/系统/错误日志 |
| 13 | 批量操作功能 | 🟡 中 | 所有数据模块支持批量操作 |
| 14 | AI生成增强 | 🔵 低 | 文件导入、Postman集成、Pytest |

---

## 三、核心架构决策

### 3.1 数据模型层级
```
Workspace（工作空间）
  └── Project（项目）
        └── System（系统）
              └── Page（页面）
                    └── TestCase（测试用例）
```

### 3.2 权限模型
- **ADMIN**: 全部权限（用户管理、系统配置）
- **USER**: 工作空间管理、测试用例管理
- **GUEST**: 只读访问

### 3.3 AI生成设计
- **温度参数**: 0.1-1.0，控制生成数量和创意性
- **Prompt工程**: 针对Web/APP/API三种类型定制
- **API集成**: Moonshot/OpenAI，支持用户自定义API Key

---

## 四、API端点记录

### 4.1 新增API
- `GET /api/workspaces/:id/projects` - 获取工作空间项目列表
- `GET /api/projects/:id/systems` - 获取项目系统列表
- `GET /api/systems/:id/pages` - 获取系统页面列表

### 4.2 现有API
- `POST /api/ai/generate-testcases` - AI生成测试用例
- `GET/POST /api/admin/config` - 系统配置管理
- `GET/PUT/DELETE /api/admin/users` - 用户管理

---

## 五、环境配置

### 5.1 环境变量
```bash
KIMI_API_KEY=sk-kimi-7JLP4sHBMmjj3944zvmmyMUtpFhiL9euiMjSdgRhxfwugAL8qi7evauFr4akOZ7m
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ai-test-platform-secret-key
```

### 5.2 账号库
| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | admin123 | ADMIN |
| demo@example.com | password123 | USER |
| test1/test2@example.com | test123 | USER |
| guest@example.com | guest123 | GUEST |

---

## 六、知识库内容

### 6.1 已导入文档（5篇）
1. 🚀 快速开始指南
2. 📋 测试规范大全
3. 🤖 AI 测试用例生成指南
4. 🔧 系统配置与维护
5. 👥 系统账号库

---

## 七、待优化方向（基于行业学习）

### 7.1 功能优化建议
1. **需求追溯**: 测试用例与需求文档双向关联
2. **版本控制**: 用例历史版本快照
3. **智能推荐**: 基于历史数据推荐关联用例
4. **覆盖率分析**: 测试覆盖率报表
5. **缺陷预测**: 基于执行模式预测高风险用例

### 7.2 技术优化建议
1. **批量操作**: 所有列表支持批量CRUD
2. **导入导出**: 支持Excel/JSON/CSV多格式
3. **API集成**: Postman/Swagger集成
4. **自动化**: Pytest/Selenium代码生成
5. **定时任务**: Cron表达式支持

---

## 八、开发规范

### 8.1 命名规范
```
ATP-[类型]-[序号]-[描述]-v[版本号].md
类型: PRD/DEV/STD/TC/PROMPT/GUIDE/AUX
```

### 8.2 文件结构
```
docs/
├── README.md
├── DOCUMENT_NAMING_CONVENTION.md
├── PROGRESS_跨会话记忆.md
├── PRD/      # 产品需求
├── DEV/      # 开发文档
├── TEST/     # 测试文档
├── PROMPT/   # AI Prompt库
└── AUX/      # 辅助文档
```

---

## 九、后续工作计划

### 9.1 近期（稳定性）
- [ ] 修复用例库页面报错（如需要）
- [ ] 开发仪表盘功能
- [ ] 系统配置功能完整性检查

### 9.2 中期（效率工具）
- [ ] 批量操作功能
- [ ] 日志功能
- [ ] 定时执行功能

### 9.3 长期（高级功能）
- [ ] 权限系统重构
- [ ] AI生成增强
- [ ] UI布局优化

---

## 十、关键上下文

### 10.1 用户偏好
- 重视权限控制和安全
- 喜欢层级清晰的管理方式
- 需要批量操作提升效率
- 希望AI真正智能化

### 10.2 技术约束
- 使用Next.js框架
- SQLite数据库
- 前端使用shadcn/ui
- 支持本地开发和部署

### 10.3 业务场景
- 中小型测试团队
- 敏捷开发流程
- 需要零代码/低代码体验
- 支持Web/APP/API测试

---

**文档维护者**: AI Test Platform Team
**更新频率**: 每次会话后更新
**访问权限**: 开发者、AI助手
