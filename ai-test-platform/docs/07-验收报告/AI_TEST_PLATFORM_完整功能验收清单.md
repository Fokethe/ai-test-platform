# AI Test Platform 完整功能验收清单

> 版本: 2026-03-25  
> 适用范围: 当前 `P0/P1` 已实现功能（发布前完整回归）

---

## 1. 验收范围

### 1.1 本轮必须覆盖（P0/P1）

- 认证与用户
- 工作空间 / 项目 / 系统 / 页面层级
- 测试中心（手工用例、批量操作、导出）
- AI 生成用例
- 执行中心（单次执行、重跑、定时）
- 质量看板（Issue、报告）
- 资产库（文档、页面、片段）
- 集成（Webhook / GitHub / GitLab / Jenkins）
- 通知
- 仪表盘与统计
- 设置（profile、roles、users、custom-fields、system、ai）

### 1.2 本轮不阻断（P2）

- UI 布局优化
- 可视化录制
- AI Bug 分析
- 第三方集成增强（Jira/禅道）

这些项统一标记为 `N/A`，不作为本轮发布阻断条件。

---

## 2. 执行前准备

在 `ai-test-platform/my-app` 下执行：

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

基础检查：

- `GET /api/health` 返回 `healthy`
- 测试账号可登录（`demo@example.com`、`admin@example.com`）
- 浏览器控制台无持续报错

---

## 3. 标准执行顺序

1. 先跑基线扫描（不自动修复）  
`/acceptance --no-fix`
2. 查看问题报告并分级  
`/acceptance --report`
3. 跑完整验收闭环（自动修复 + 回归）  
`/acceptance`
4. 再次确认结果与历史趋势  
`/acceptance --report` 和 `/acceptance --history`
5. 对照本清单补充“模块级人工场景”记录（尤其是跨角色、跨模块流程）

---

## 4. 模块映射与必测项

| 模块 | 核心页面（UI） | 核心接口（API） | 必测场景 | 通过标准 |
|------|---|---|---|---|
| 认证与用户 | `/login` `/register` `/settings/profile` `/settings/users` `/settings/roles` | `/api/auth/register` `/api/auth/me` `/api/users` `/api/users/[id]` `/api/user/profile` `/api/user/settings` | 登录、注册、会话失效、角色可见性 | 非授权请求被拒绝，登录态一致 |
| 工作空间与项目层级 | `/workspaces` `/workspaces/[id]` `/projects` `/projects/[id]` | `/api/workspaces` `/api/workspaces/[id]` `/api/projects` `/api/projects/[id]` `/api/projects/[id]/members` | 创建/编辑/删除、成员管理、跨层级跳转 | 数据归属正确、无越权 |
| 系统与页面管理 | `/systems` `/systems/[id]` | `/api/systems` `/api/systems/[id]` `/api/pages` `/api/pages/[id]` | 系统创建、页面创建、关联关系一致 | 项目-系统-页面关系正确 |
| 测试中心 | `/tests` `/tests/new` `/tests/[id]` | `/api/tests` `/api/tests/[id]` `/api/tests/batch` `/api/tests/export` | 手工创建、批量改动、删除、导出 | 列表与详情一致、操作可追溯 |
| AI 生成用例 | `/ai-generate` `/ai-generate/requirements` `/ai-generate/testcases` | `/api/requirements/upload` `/api/requirements/[id]/generate-testcases` `/api/review` | 上传需求、生成用例、审核后导入 | 生成链路闭环、失败可回滚 |
| 执行中心 | `/runs` `/runs/new` `/runs/scheduled/new` `/runs/[id]` `/executions` | `/api/runs` `/api/runs/[id]` `/api/runs/[id]/rerun` `/api/executions` `/api/executions/[id]/status` | 创建执行、状态流转、重跑、定时任务 | 状态机合法、执行记录完整 |
| 质量看板 | `/quality` `/quality/issues` `/quality/reports` `/issues` `/reports` | `/api/issues` `/api/issues/[id]` `/api/issues/[id]/lifecycle` `/api/reports/stats` `/api/reports/export/*` | Issue 创建-流转-关闭、报告导出 | 生命周期可追踪、统计口径一致 |
| 资产库与知识库 | `/assets` `/assets/[id]` `/knowledge` | `/api/assets` `/api/assets/[id]` `/api/knowledge` `/api/knowledge/search` `/api/knowledge/ingest` | 文档/页面/片段 CRUD、检索与引用 | 检索结果可复现、权限隔离正确 |
| 集成中心 | `/integrations` | `/api/integrations` `/api/integrations/[id]/toggle` `/api/integrations/[id]/deliveries` | 创建集成、启停、投递记录 | 投递状态准确、失败可定位 |
| 通知中心 | `/notifications` | `/api/notifications` `/api/notifications/unread` `/api/notifications/read-all` `/api/notifications/[id]/read` | 未读统计、单条已读、全部已读 | 通知状态一致、无重复/丢失 |
| 仪表盘与指标 | `/dashboard` `/ai-metrics` | `/api/dashboard` `/api/ai-metrics` `/api/metrics` `/api/observability/*` | 核心指标展示、过滤、趋势一致性 | UI 指标与 API 数据一致 |
| 系统设置 | `/settings` `/settings/ai` `/settings/system` `/settings/custom-fields` `/settings/activity` | `/api/settings/ai` `/api/system/config` `/api/custom-fields` `/api/logs/*` | 配置生效、审计日志、自定义字段 | 配置改动可追踪、刷新后仍生效 |

---

## 5. 本项目验收红线（任一触发即不通过）

- 核心业务链路中断：`登录 -> 工作空间 -> 项目 -> 系统 -> 页面 -> 测试 -> 执行 -> Issue`
- 任一高优先级安全问题未关闭（认证绕过、越权、敏感信息泄露）
- 执行中心状态机不一致（执行状态与报告/Issue 不一致）
- 质量看板统计与原始数据不一致
- 集成投递状态不可追踪

---

## 6. 验收记录模板（每批次复制）

```markdown
批次ID: acceptance-YYYYMMDD-XXX
版本: <git tag/commit>
环境: dev/staging/prod

[ ] 认证与用户
[ ] 工作空间与项目层级
[ ] 系统与页面管理
[ ] 测试中心
[ ] AI 生成用例
[ ] 执行中心
[ ] 质量看板
[ ] 资产库与知识库
[ ] 集成中心
[ ] 通知中心
[ ] 仪表盘与指标
[ ] 系统设置

阻断问题:
- P0:
- P1:

结论:
- [ ] 通过
- [ ] 不通过
```

---

参考来源:

- `docs/00-core/project-overview.md`
- `docs/01-开发文档/04-使用指南/GUIDE.md`
- `.clinerules/skills/quality/project-acceptance/SKILL.md`
