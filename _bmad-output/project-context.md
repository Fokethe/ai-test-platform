---
project_name: "ai-test-platform-1"
user_name: "Fokethe"
date: "2026-03-19"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - data_rules
  - api_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: "complete"
rule_count: 27
optimized_for_llm: true
existing_patterns_found: 14
---

# Project Context for AI Agents

_该文件用于约束 AI 代理在本项目中的实现方式，重点记录“容易忽略但会导致问题”的规则。_

---

## Technology Stack & Versions

- 主应用目录: `ai-test-platform/my-app`
- Runtime: Node `>=18`, npm `>=9`
- 前端/全栈: Next.js `16.1.6` + React `19.2.3` + TypeScript `5`
- 认证: NextAuth `4.24.13` + `@next-auth/prisma-adapter`
- 数据层: Prisma `6.x` + SQLite（开发默认 `file:./prisma/dev.db`）
- 样式/UI: TailwindCSS `4` + shadcn/ui + Radix
- 测试: Jest `29` + Testing Library + Playwright `1.58`
- 验证与接口: Zod + 自定义统一 API 响应封装

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript 为 `strict: true`，新增代码必须通过严格类型检查。
- 使用 `@/*` 路径别名（映射 `src/*`），避免深层相对路径。
- 避免滥用 `any`；确需使用时要给出边界和理由。
- 文件编码统一 UTF-8（建议无 BOM），避免中文文案出现乱码（mojibake）。
- `.env` 解析相关逻辑需兼容 Windows `CRLF`（使用 `/\r?\n/`）。

### Framework-Specific Rules

- 使用 Next.js App Router：页面在 `src/app/**/page.tsx`，API 在 `src/app/api/**/route.ts`。
- 路由分组约定为 `(auth)` 与 `(dashboard)`，新增页面按分组放置。
- 受保护 API 默认使用 `auth()` 或 `getServerSession(authOptions)` 做鉴权。
- NextAuth 采用 Credentials + PrismaAdapter，登录页固定 `/login`。
- `NEXTAUTH_SECRET` 生产环境必须配置；开发环境可使用 fallback（仅限本地）。

### Data & Prisma Rules

- `Test` 新模型中 `requirementId` 是必填字段（非可选），创建 `Test` 必须传入。
- `content`、`tags` 等字段在数据库中是 `String`，存储 JSON 时需手动 `JSON.stringify`。
- 新旧模型并存（如 `TestCase` 与 `Test`），新开发优先使用重构后的 `Test/Run/Issue/Asset` 模型。
- 修改 `schema.prisma` 后必须执行 `prisma generate`，必要时执行迁移。

### API Rules

- 统一响应格式：优先使用 `successResponse` / `errorResponse` / `listResponse` / `buildMeta`。
- 避免混用响应风格（例如 `Response.json(errorResponse(...))` 这种二次封装）。
- 解析请求体优先使用 `parseJsonBody`，分页参数优先使用 `buildQueryParams`。
- 鉴权失败统一返回 401，业务错误返回明确状态码与 message。

### Testing Rules

- 测试文件命名遵循 `src/**/__tests__/**/*.test.ts(x)`。
- Jest 依赖 `moduleNameMapper` 的 mock 路径时，目标文件必须真实存在。
- API Route 单测建议使用 `NextRequest` 语义（不要长期用裸 `Request` 替代）。
- 在受限环境中若出现 `spawn EPERM`，优先 `--runInBand` 降并发排查。

### Code Quality & Style Rules

- Prettier 约定：`semi: true`、`singleQuote: true`、`printWidth: 100`。
- ESLint 约定：限制复杂度（`complexity max 8`），`console` 仅允许 `warn/error/info`。
- 新增代码应与现有目录语义一致：`lib/` 放通用能力，`app/api/` 放路由处理。

### Development Workflow Rules

- 本地启动前先执行 `npm run env:check`，确认 `DATABASE_URL` 与 `NEXTAUTH_SECRET`。
- 常规流程：`npm install` → `npm run db:migrate` → `npm run db:seed` → `npm run dev`。
- Demo 账号依赖 seed 数据（`demo@example.com / password123`），排障时先确认 seed 完成。
- `.env` 不提交；使用 `.env.example` 作为模板并保持与代码必需变量一致。

### Critical Don't-Miss Rules

- 不要在业务落库时继续写死 `createdBy/reporterId = 'system'`，应优先使用 session 用户。
- 代码中存在历史重构痕迹，新增接口不要继续依赖 deprecated 模型。
- 鉴权逻辑要统一检查 `session.user.id`，仅检查 email 容易造成权限边界不一致。
- 变更认证、环境变量、Prisma 字段后，必须同步更新相关测试与 mock。
- 发生编码异常（中文乱码）时，先检查文件编码/终端编码，再继续功能排查。

---

## Usage Guidelines

**For AI Agents**

- 实现前先读本文件，再读目标模块代码。
- 以“更严格的约束”为准，不确定时优先保守实现。
- 若发现新规则（或旧规则失效），先更新本文件再继续大规模改动。

**For Humans**

- 技术栈、鉴权、数据模型变更后第一时间更新本文件。
- 每个迭代至少复核一次“Critical Don't-Miss Rules”。
- 删除已过时规则，保持文档精简可执行。

Last Updated: 2026-03-19
