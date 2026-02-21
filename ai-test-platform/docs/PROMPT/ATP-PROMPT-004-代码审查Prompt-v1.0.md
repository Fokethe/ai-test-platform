# AI-004: AI 辅助代码审查

## 使用场景
需要 AI 帮助审查代码质量时使用

## Prompt 模板

```markdown
## 代码审查任务

### 审查范围
[文件路径 / PR链接 / 代码片段]

### 审查重点 (可多选)
☐ 功能正确性 - 逻辑是否正确实现需求  
☐ 代码规范 - 命名、格式、结构  
☐ 性能优化 - 是否存在性能问题  
☐ 安全性 - 安全隐患  
☐ 可维护性 - 可读性、可扩展性  
☐ 测试覆盖 - 是否有足够测试  
☐ TypeScript - 类型定义是否正确

### 代码内容
```typescript
[粘贴需要审查的代码]
```

### 上下文信息
- 这个功能是做什么的: [描述]
- 相关PR: [链接]
- 设计文档: [链接]

### 特别关注点
[如有特别需要关注的点，请说明]

### 期望输出格式
请按以下格式提供审查意见：

#### 🔴 Critical (必须修复)
[阻塞性问题]

#### 🟠 Major (建议修复)
[重要改进建议]

#### 🟡 Minor (可选)
[小建议]

#### ✅ Good (值得肯定)
[做得好的地方]

---

请开始审查代码，提供具体的行号和改进建议。
```

## 示例

```markdown
## 代码审查任务

### 审查范围
src/app/api/workspaces/route.ts

### 审查重点
☑ 功能正确性  
☑ 代码规范  
☑ 安全性  
☑ 可维护性

### 代码内容
```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  
  const workspace = await prisma.workspace.create({
    data: {
      name: body.name,
      description: body.description,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
    },
  });

  return NextResponse.json(workspace);
}
```

### 上下文
创建工作空间的API接口
```

## 输出预期

AI 应该输出：
1. 按严重级别分类的问题列表
2. 具体的问题位置（行号）
3. 改进建议代码示例
4. 最佳实践参考
5. 整体评价
