# AI Test Platform - 启动指南

## 快速启动步骤

### 1. 确保在正确的目录

```powershell
# 必须在这个目录下操作
cd F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app

# 验证位置正确
pwd
# 应该输出: F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app
```

### 2. 检查端口占用

```powershell
# 检查 3000 端口是否被占用
netstat -ano | findstr :3000

# 如果有输出，结束占用进程（将 <PID> 替换为实际进程ID）
taskkill /PID <PID> /F
```

### 3. 清除缓存并启动

```powershell
# 在项目目录下执行
cd F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app

# 清除 Next.js 缓存
Remove-Item -Recurse -Force .next

# 重新启动
npm run dev
```

### 4. 访问正确的地址

```
http://localhost:3000
```

**注意**：必须是 `:3000` 而不是 `:3001`

---

## 常见问题

### Q1: 显示 "To get started, edit the page.tsx file"
**原因**: 访问了默认首页
**解决**: 已修复，现在会自动重定向到 /workspaces

### Q2: 端口显示 3001 而不是 3000
**原因**: 3000 端口被其他程序占用
**解决**: 
```powershell
# 结束占用进程后重启
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm run dev
```

### Q3: Compiling 卡住不动
**原因**: Turbopack 编译器问题
**解决**: 已切换到 webpack 模式

---

## 验证清单

- [ ] 目录正确：`F:\ai-test-platform\ai-test-platform\ai-test-platform\my-app`
- [ ] 端口正确：`localhost:3000`
- [ ] 页面显示：登录页面或工作台
- [ ] 登录账号：`demo@example.com` / `password123`

---

## 测试步骤

1. 访问 `http://localhost:3000`
2. 应该自动跳转到 `http://localhost:3000/login`
3. 输入账号密码登录
4. 进入工作台后能看到 "示例工作空间"
