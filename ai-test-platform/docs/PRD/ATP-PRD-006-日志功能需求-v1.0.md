# AI Test Platform - 日志功能需求文档

> 文档编号: ATP-PRD-006
> 版本: v1.0
> 创建日期: 2026-02-17

---

## 1. 需求概述

系统需要记录操作日志，用于审计、故障排查和用户行为分析。

---

## 2. 日志类型

| 类型 | 说明 | 记录内容 |
|------|------|----------|
| 操作日志 | 用户操作 | CRUD操作、登录/登出 |
| 系统日志 | 系统事件 | 错误、警告、启动/停止 |
| 执行日志 | 测试执行 | 用例执行结果、耗时 |

---

## 3. 日志字段

```typescript
interface Log {
  id: string;
  type: 'OPERATION' | 'SYSTEM' | 'EXECUTION';
  level: 'INFO' | 'WARN' | 'ERROR';
  userId?: string;
  action: string;
  target: string;
  targetId?: string;
  message: string;
  details?: any;
  ip?: string;
  createdAt: Date;
}
```

---

## 4. 功能

- [x] 自动记录关键操作
- [x] 日志查询（按类型、时间、用户）
- [x] 日志导出
- [x] 分页显示

---

## 5. 记录点

- 用户登录/登出
- 工作空间CRUD
- 测试用例CRUD
- 测试执行
- 系统配置变更
