# encoding: utf-8
# -*- coding: utf-8 -*-

## Skill 00: 全局基础工具 (Global Tools)

【定位】: 所有 Skills 共享的基础工具集合
【作用】: 提供路径验证、编码修复、检查点追踪等通用功能
【引用方式】: 其他 Skills 通过链接或引用使用

---

## 【🛠️ 工具1: 路径验证器】

### 路径验证规则

```typescript
// 路径验证器 - 所有文件操作前必须调用
function validatePath(filePath: string): string {
  const PROJECT_ROOT = 'ai-test-platform';
  
  // 检查路径是否包含项目根目录
  if (!filePath.includes(PROJECT_ROOT)) {
    // 自动修正路径
    return `ai-test-platform/${filePath}`;
  }
  
  return filePath;
}

// 路径自动修正函数
function autoCorrectPath(path: string): string {
  const patterns = [
    { wrong: /^docs\//, correct: 'ai-test-platform/docs/' },
    { wrong: /^src\//, correct: 'ai-test-platform/my-app/src/' },
    { wrong: /^(my-app|app)\//, correct: 'ai-test-platform/my-app/' },
    { wrong: /^prisma\//, correct: 'ai-test-platform/my-app/prisma/' },
    { wrong: /^public\//, correct: 'ai-test-platform/my-app/public/' },
    { wrong: /^scripts\//, correct: 'ai-test-platform/my-app/scripts/' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.wrong.test(path)) {
      return path.replace(pattern.wrong, pattern.correct);
    }
  }
  
  return path;
}
```

### 强制路径规范

| 操作类型 | 错误路径 | 正确路径 |
|---------|---------|---------|
| 文件写入 | `docs/07-验收报告/` | `ai-test-platform/docs/07-验收报告/` |
| 命令执行 | `cd my-app && npm test` | `cd ai-test-platform/my-app && npm test` |
| 读取文件 | `src/lib/api.ts` | `ai-test-platform/my-app/src/lib/api.ts` |
| 创建目录 | `mkdir docs/report` | `mkdir ai-test-platform/docs/report` |

---

## 【🔧 工具2: 编码修复器】

### Windows UTF-8 设置

```bash
# 每个命令执行前自动添加
chcp 65001
set LANG=zh_CN.UTF-8
set PYTHONIOENCODING=utf-8
```

### 自动编码修复函数

```typescript
function executeWithUtf8(command: string): string {
  const SET_UTF8 = 'chcp 65001 >nul 2>&1 && ';
  return SET_UTF8 + command;
}

// 使用示例
const command = executeWithUtf8('npm test');
// 结果: 'chcp 65001 >nul 2>&1 && npm test'
```

---

## 【📊 工具3: 检查点追踪器】

### 检查点追踪器定义

```typescript
interface CheckpointTracker {
  total: number;                // 总检查点数
  completed: number;            // 已完成
  failed: number;               // 失败
  skipped: number;              // 跳过
  status: Map<string, boolean>; // 每个检查点状态
}

// 创建追踪器
function createTracker(total: number): CheckpointTracker {
  return {
    total,
    completed: 0,
    failed: 0,
    skipped: 0,
    status: new Map()
  };
}

// 标记检查点完成
function markComplete(tracker: CheckpointTracker, id: string, passed: boolean): void {
  tracker.status.set(id, passed);
  tracker.completed++;
  if (!passed) tracker.failed++;
}

// 显示进度
function showProgress(tracker: CheckpointTracker): string {
  const percent = Math.round((tracker.completed / tracker.total) * 100);
  return `[${'█'.repeat(percent/5)}${'░'.repeat(20-percent/5)}] ${tracker.completed}/${tracker.total} (${percent}%)`;
}
```

---

## 【🔄 工具4: 同步更新检查清单】

### Skill修改强制检查清单

```markdown
## 【⚠️ Skill修改强制检查清单】

修改本Skill时，必须完成以下同步更新：

- [ ] 1. 更新 `.clinerules` (触发关键词/快捷指令)
- [ ] 2. 更新 `.clinerules/skills/skill-XX-xxx.md` (本文件)
- [ ] 3. 更新 `.kimi/skills/{skill-name}/skill-XX-xxx.md` (Kimi版本)
- [ ] 4. 更新 `.clinerules/USAGE.md` (快捷指令表)
- [ ] 5. 更新 `.kimi/skills/USAGE_GUIDE.md` (Kimi使用指南)
- [ ] 6. 更新版本号 (X.Y → X.Y+1)
- [ ] 7. 更新最后更新时间
- [ ] 8. 验证 Cline 和 Kimi 版本内容一致

**违规后果**: Skill定义不一致，导致Cline和Kimi行为差异

**快速查找表：Kimi Skill 路径**
| Skill # | Skill 名称 | Kimi 路径 |
|---------|-----------|-----------|
| 01 | 成本控制协议 | `.kimi/skills/cost-control/` |
| 02 | 大文档分段处理 | `.kimi/skills/doc-processor/` |
| 03 | 任务拆解与规划 | `.kimi/skills/task-planner/` |
| 04 | 代码审查协议 | `.kimi/skills/code-review/` |
| 05 | 需求审问与项目启动 | `.kimi/skills/socratic-inquiry/` |
| 06 | 文档三轨与提交系统 | `.kimi/skills/doc-system/` |
| 07 | 调试诊断协议 | `.kimi/skills/debug-diagnosis/` |
| 08 | 危险信号检测 | `.kimi/skills/danger-signals/` |
| 09 | BugHunter V2.0 | `.kimi/skills/bughunter/` |
| 10 | 多任务调度器 | `.kimi/skills/multi-task-scheduler/` |
| 11 | 自动清理 V2.5 | `.kimi/skills/auto-cleanup/` |
| 12 | 系统健康检查 | `.kimi/skills/health-check/` |
| 13 | 功能深度审查器 | `.kimi/skills/deep-inspector/` |
| 14 | 第三方验收专家 | `.kimi/skills/project-acceptance/` |
```

---

## 【🤖 工具5: /yolo 和 /compact 实际执行定义】

### /yolo 指令执行

```yaml
指令: /yolo
触发: 用户输入 "/yolo"
执行动作:
  1. 设置 session.autoMode = true
  2. 设置 session.confirmationRequired = false
  3. 输出: "🤖 已进入YOLO模式 - 自动执行，无需确认"
  4. 后续所有操作自动执行，不询问用户确认

效果:
  - 命令自动执行
  - 文件自动创建/修改
  - 测试自动运行
  - 仅关键节点输出结果
```

### /compact 指令执行

```yaml
指令: /compact
触发: 
  - 用户输入 "/compact"
  - 上下文使用率 > 60% (自动触发)
  - 进入修复阶段前 (强制触发)

执行动作:
  1. 保存当前状态到 memory.md
  2. 生成上下文摘要 (保留关键信息)
  3. 压缩/清理历史输出
  4. 显示: "🗜️ Compact完成 - 使用率: {before}% → {after}%"
  5. 继续执行任务
```

---

## 【📋 引用方式】

其他 Skills 在文件开头引用：

```markdown
## 【基础工具引用】

本 Skill 使用 Skill 00 提供的基础工具：
- 路径验证器: 自动修正文件路径
- 编码修复器: 自动设置 UTF-8
- 检查点追踪器: 追踪任务进度
- 同步检查清单: 确保更新同步

详细定义: `.clinerules/skills/skill-00-global-tools.md`
```

---

*工具版本: 1.0 | 最后更新: 2026-03-12*
