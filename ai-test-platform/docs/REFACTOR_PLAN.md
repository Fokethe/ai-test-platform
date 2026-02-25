# 系统重构计划

## 重构目标
- 简化系统架构：18 路由 → 8 路由
- 合并模型：26 个 → 14 个
- 统一 API：58 个 → 30 个

## 新架构设计

### 1. 导航结构 (8 项)
```
仪表盘      → 保持独立
测试中心    → 合并: 用例库 + 测试套件 + AI生成
执行中心    → 合并: 执行历史 + 定时任务
质量看板    → 合并: Bug管理 + 报告中心
资产库      → 合并: 知识库 + 页面管理
集成        → 合并: CI/CD Webhook
通知        → 保持独立
设置        → 合并: AI设置 + 系统设置 + 用户 + 日志
```

### 2. 模型映射
```
旧模型                    → 新模型
─────────────────────────────────────────
TestCase                  → Test (type='CASE')
TestSuite                 → Test (type='SUITE')
TestSuiteCase             → Test (parentId 关联)

TestRun + TestExecution   → Run (executions 内嵌数组)
SuiteExecution            → Run (type='SUITE')

Bug                       → Issue (type='BUG')
KnowledgeEntry            → Asset (type='DOC')
Page                      → Asset (type='PAGE')

Webhook + WebhookDelivery → Integration + Delivery
ScheduledTask             → Run (schedule 字段)

Notification              → Inbox (简化)
Log                       → Activity
```

### 3. 重构阶段

#### Phase 1: 架构测试 ✅
- [x] 编写新架构契约测试 (18 tests)

#### Phase 2: 模型层重构
- [ ] 更新 Prisma Schema
- [ ] 创建数据迁移脚本
- [ ] 运行迁移测试

#### Phase 3: API 层重构
- [ ] 合并 API 路由
- [ ] 统一响应格式
- [ ] 向后兼容层

#### Phase 4: UI 层重构
- [ ] 重构导航组件
- [ ] 合并页面
- [ ] 重定向旧路由

#### Phase 5: 验证
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 清理旧代码

## 风险评估
- 数据迁移：中等风险（需备份）
- API 兼容：低风险（提供重定向）
- 用户体验：中等风险（需适应新导航）

## 回滚策略
1. 数据库备份
2. 蓝绿部署
3. 旧 API 保留 1 版本
