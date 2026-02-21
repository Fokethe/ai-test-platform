# AI Test Platform - 仪表盘功能需求文档

> 文档编号: ATP-PRD-003
> 版本: v1.0
> 创建日期: 2026-02-17
> 状态: 开发中

---

## 1. 需求背景

执行中心和报告中心数据不一致，用户需要一个统一的仪表盘来：
- 一目了然查看核心测试指标
- 快速了解测试执行状态
- 提供快捷操作入口
- 支持数据筛选和时间范围选择

---

## 2. 功能需求

### 2.1 核心指标卡片
| 指标 | 说明 | 数据来源 |
|------|------|----------|
| 总用例数 | 系统中测试用例总数 | TestCase表count |
| 今日执行 | 今日执行次数 | Execution表今日统计 |
| 通过率 | 最近7天执行通过率 | Execution表聚合 |
| 失败数 | 最近7天失败次数 | Execution表聚合 |

### 2.2 执行趋势图表
- 折线图展示最近7天/30天/90天执行趋势
- X轴：日期
- Y轴：执行次数
- 双曲线：通过次数 + 失败次数

### 2.3 最近执行记录
- 列表展示最近10条执行记录
- 字段：用例名称、状态、执行时间、耗时

### 2.4 快捷操作
- 快速创建测试用例
- 快速创建测试套件
- 跳转到AI生成

---

## 3. 技术方案

### 3.1 数据API
```
GET /api/dashboard/stats
响应：{
  totalTestCases: number,
  todayExecutions: number,
  passRate: number,
  failedCount: number,
  trend: Array<{date, passed, failed}>,
  recentExecutions: Array<Execution>
}
```

### 3.2 页面路由
```
/dashboard (新页面，工作台重定向)
```

### 3.3 组件结构
```
DashboardPage
├── StatsCards (指标卡片)
├── TrendChart (趋势图表)
├── RecentExecutions (最近执行)
└── QuickActions (快捷操作)
```

---

## 4. 验收标准

- [ ] 页面正常加载，无报错
- [ ] 核心指标数据正确
- [ ] 图表可切换时间范围
- [ ] 快捷操作可正常跳转
- [ ] 响应式布局正常

---

## 5. 后续优化

- 自定义仪表盘布局
- 添加更多图表类型
- 支持导出报表
