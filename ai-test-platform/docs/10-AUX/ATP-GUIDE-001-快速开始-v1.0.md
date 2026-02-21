# AI Test Platform - 快速启动指南

## 当前状态：Phase 1 MVP 已完成 ✅

所有核心功能已完成，包括：
- ✅ 用户认证（登录/注册）
- ✅ 工作空间/项目/系统/页面 层级管理
- ✅ 测试用例管理（手动创建）
- ✅ AI 生成测试用例（支持模拟数据）
- ✅ 完整的导航流程

---
cd F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app
npm run db:migrate
npm run db:seed
npm run dev
demo@example.com	password123       admin@example.com  admin123

# 查看端口占用
netstat -ano | findstr :3000

# 终止占用进程（替换 <PID> 为实际进程号）
taskkill /F /PID <PID>

## 启动步骤

### 1. 进入项目目录
```powershell
cd F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app
```

### 2. 确保依赖已安装
```powershell
npm install
```

### 3. 确保数据库已初始化
```powershell
# 如果还没有数据库
npm run db:migrate
npm run db:seed
```

### 4. 启动开发服务器
```powershell
npm run dev
```

### 5. 访问
```
http://localhost:3000
```

---

## 测试账号

- **邮箱**: `demo@example.com`
- **密码**: `password123`

---

## 功能验证清单

### 1. 登录 ✅
- [ ] 访问 http://localhost:3000
- [ ] 自动跳转到登录页
- [ ] 使用 demo@example.com / password123 登录
- [ ] 进入工作台

### 2. 层级导航 ✅
- [ ] 工作台显示"示例工作空间"
- [ ] 点击进入工作空间 → 显示"电商系统测试"项目
- [ ] 点击进入项目 → 显示"订单管理系统"
- [ ] 点击进入系统 → 显示"订单列表页"
- [ ] 点击进入页面 → 显示页面详情和用例列表

### 3. 创建层级 ✅
- [ ] 创建新的工作空间
- [ ] 在工作空间中创建项目
- [ ] 在项目中创建系统
- [ ] 在系统中创建页面

### 4. 手动创建用例 ✅
- [ ] 在页面详情点击"新建用例"
- [ ] 填写表单（标题、步骤、预期结果）
- [ ] 提交后返回页面详情，显示新用例

### 5. AI 生成用例 ✅
- [ ] 在页面详情点击"AI 生成用例"
- [ ] 输入需求描述（如"用户登录功能"）
- [ ] 点击生成，等待结果
- [ ] 选择需要的用例
- [ ] 点击导入

---

## 常见问题

### Q1: 登录后显示 "Compiling..." 卡住
**解决**: 清除缓存重启
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### Q2: 访问的是 3001 端口
**解决**: 确保访问 `localhost:3000`，不是 3001

### Q3: AI 生成很慢
**原因**: 当前使用模拟数据，生成过程有1.5秒延迟模拟真实场景

### Q4: AI 想使用真实 Kimi API
**解决**: 
1. 在 `my-app/.env` 中添加：
   ```
   KIMI_API_KEY=your_kimi_api_key_here
   ```
2. 重启服务

---

## 项目结构

```
ai-test-platform/my-app/
├── src/
│   ├── app/                      # Next.js 页面
│   │   ├── (auth)/               # 认证页面（登录/注册）
│   │   ├── (dashboard)/          # 主控制台
│   │   │   ├── ai-generate/      # AI 生成用例 ✅
│   │   │   ├── pages/            # 页面管理 ✅
│   │   │   ├── projects/         # 项目管理 ✅
│   │   │   ├── systems/          # 系统管理 ✅
│   │   │   ├── testcases/        # 用例管理 ✅
│   │   │   └── workspaces/       # 工作空间管理 ✅
│   │   └── api/                  # API 路由
│   │       ├── ai/               # AI 相关 API ✅
│   │       ├── auth/             # 认证 API ✅
│   │       ├── pages/            # 页面 API ✅
│   │       ├── projects/         # 项目 API ✅
│   │       ├── systems/          # 系统 API ✅
│   │       ├── testcases/        # 用例 API ✅
│   │       └── workspaces/       # 工作空间 API ✅
│   ├── components/ui/            # shadcn/ui 组件
│   └── lib/                      # 工具函数
│       ├── ai/                   # AI 相关 ✅
│       └── prisma.ts             # 数据库客户端
├── prisma/
│   ├── schema.prisma             # 数据库模型
│   └── seed.ts                   # 种子数据
└── docs/                         # 项目文档
```

---

## 下一步开发（可选）

如需继续开发，可以：

1. **Day 11-12: 测试执行**
   - 集成 Playwright
   - 测试执行功能
   - 执行结果展示

2. **Day 13-14: Demo 完善**
   - 更多示例数据
   - Bug 修复
   - 性能优化

3. **V1.0 功能增强**
   - 需求导入（Word/PDF）
   - 用例编辑/删除
   - 测试报告导出

---

## 联系

如有问题，请参考：
- `docs/PROGRESS.md` - 详细进度
- `docs/CLAUDE.md` - AI 协作手册
- `README.md` - 项目说明
