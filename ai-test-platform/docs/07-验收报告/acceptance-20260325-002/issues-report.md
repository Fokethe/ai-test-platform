# 验收问题报告

## 报告信息

| 字段 | 值 |
|------|-----|
| 批次ID | acceptance-20260325-002 |
| 模式 | no-fix |
| 时间 | 2026-03-25 |
| 提交版本 | e009a5a8 |
| 触发命令 | /acceptance --no-fix（shell 等价执行） |

## 结果摘要

| 检查项 | 结果 |
|------|------|
| ESLint | 失败（272 errors / 401 warnings） |
| 单元测试 | 失败（5 suites failed, 21 tests failed） |
| API测试 | 通过（63 suites passed, 287 tests passed） |
| API守卫测试 | 通过（3 suites passed, 21 tests passed） |
| 运行时连通性 | 通过（/api/health 200，关键路由可达） |
| E2E冒烟 | 失败（Epic7 登录前置断言失败） |

## 问题清单（按优先级）

### P1（高）

#### ISSUE-P1-001 Epic7 冒烟用例失败（功能断言）
- 现象: `e2e/epic7-smoke.spec.ts` 运行到 `auth.setup.ts:35` 失败，`remember` 复选控件点击后未进入期望 `checked` 状态。
- 影响: 端到端业务闭环验证未通过。
- 证据: Playwright 输出 `expect(locator).toHaveAttribute('data-state','checked')` 失败。

#### ISSUE-P1-002 单元测试基线未通过
- 现象: `npm run test` 结果为 `5 failed suites / 21 failed tests`。
- 主要失败点:
  - `storage.test.ts`：数据库 schema 与测试数据不一致（`AiRequirement.version` 列缺失）
  - Dashboard 资产与 AI 设置相关测试断言不通过
- 影响: 基线回归不稳定，修复后需重跑验收。

### P2（中）

#### ISSUE-P2-001 代码静态质量基线未通过
- 现象: `npm run lint` 结果为 `272 errors / 401 warnings`（共 673 问题）。
- 影响: 代码健康度较差，增加回归风险。

## 已恢复项

- 运行态阻断项已解除：
  - 处置: 执行 `npx prisma generate`
  - 验证: `/api/health` 返回 `200`，关键页面与匿名 API 路由响应正常。

## 结论

当前批次为 **不通过**（no-fix 仅扫描，不自动修复）。  
阻断已从“运行态不可用（P0）”收敛为“测试与 E2E 失败（P1/P2）”。
