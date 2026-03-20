# Epic 7 发布检查清单（2026-03）

## 发布前（T-1 ~ T-0）
- [x] 执行一键门禁：
  ```bash
  npm run test:epic7:gate
  ```
- [x] 门禁结果留档到 `EPIC7_BASELINE_2026-03-20.md`
- [x] 关键页面乱码修复完成（runs/quality/issues 列表）
- [x] 关键 API 与页面复杂度告警收敛（本轮涉及文件已清零）
- [ ] CI 线上任务状态复核：`build` / `epic7-smoke` / `api-guards`
- [ ] 发布版本号、提交 SHA、门禁截图归档

## 发布时（T0）
- [ ] 执行数据库迁移（如有）并确认无失败
- [ ] 10 分钟内完成人工抽检：
  - `/runs/new` 创建并进入详情页
  - Run 详情失败执行快速建问题
  - `/quality/issues/new` 创建成功并进入详情
  - 状态流转 `OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED`

## 发布后观察（T0 ~ T+24h）
- [ ] 观察 `/api/runs*`、`/api/issues*` 的 5xx 是否异常上升
- [ ] 观察登录相关错误率（NextAuth）是否异常
- [ ] 观察关键路径平均响应时间是否劣化
- [ ] 如出现 P0/P1，按回滚预案执行并补 RCA

## 回滚预案
- [ ] 准备上一个稳定版本镜像或构建产物
- [ ] 回滚后优先验证 Epic7 核心链路
- [ ] 记录事故时间线、影响面、恢复时间与改进项
