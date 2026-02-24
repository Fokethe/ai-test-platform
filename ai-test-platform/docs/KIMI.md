# Project: AI Test Platform

# Stack: Next.js 16 + TypeScript + Tailwind + Prisma + NextAuth + shadcn/ui

## 技术铁律

- Mobile-first: 默认移动端，断点 sm: md: lg:
- 组件：函数式 + Hooks，禁止 Class
- 类型：禁止 any，所有 API 返回定义 interface
- 样式：只用 Tailwind 标准色 slate/blue，禁止 arbitrary values
- 图标：只用 Lucide React
- 数据库：Prisma ORM，SQLite(开发)/PostgreSQL(生产)
- 认证：NextAuth.js v4，支持邮箱/密码登录

## 文件路径约定

- 页面：src/app/[route]/page.tsx
- 布局：src/app/[route]/layout.tsx
- 组件：src/components/[Name]/index.tsx
- 工具：src/lib/utils.ts
- 类型：src/types/index.ts
- API：src/app/api/[route]/route.ts
- Hooks：src/lib/hooks/use-[name].ts

## 数据模型层级

```
Workspace（工作空间）
  └── Project（项目）
        └── System（系统）
              └── Page（页面）
                    └── TestCase（测试用例）
```

## 权限模型

- ADMIN: 全部权限（用户管理、系统配置）
- USER: 工作空间管理、测试用例管理
- GUEST: 只读访问

## 当前目标

[每次会话前手动更新，如：实现批量操作功能]

## 已完成

- [x] 项目初始化 (Next.js + shadcn)
- [x] 数据库配置 (Prisma + SQLite)
- [x] 认证系统 (NextAuth)
- [x] 工作空间/项目/系统/页面 层级管理
- [x] 测试用例管理（手动创建）
- [x] AI 生成测试用例（支持模拟数据）
- [x] 测试套件管理
- [x] 仪表盘功能
- [x] 用户管理（管理员）
- [x] 系统配置
- [x] 知识库功能
- [x] 通知系统
- [x] UI/UX优化（主题、导航栏缩放）

## 技术债务

- [ ] 需要把 API 错误处理封装到 lib/api.ts
- [ ] 表单错误提示样式不统一
- [ ] 部分功能空壳（定时执行等）

## 环境配置

```bash
# 开发账号
demo@example.com / password123
admin@example.com / admin123

# 启动命令
cd ai-test-platform/my-app
npm run dev
```
