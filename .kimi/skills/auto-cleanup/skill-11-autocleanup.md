# encoding: utf-8
# -*- coding: utf-8 -*-

## Skill 11: 自动清理 V2.5 (AutoCleanup) - 深度清理版

【触发方式】: 
- 手动触发: "/cleanup"、"清理项目"
- **新增**: "/cleanup --deep"、"深度清理"
- 根目录外溢检测自动触发

【核心增强 V2.5】: **文件夹深度清理 + 智能合并**

---

## 【清理范围】

### 文件类
- 空代码文件 (< 50 bytes)
- 临时脚本 (temp*, gen*, create*)
- 临时文本文件 (*.txt)
- 异常文件名 ($null, {, } 等)

### ⭐ V2.5 新增: 目录类
- **空目录**: 完全空的文件夹
- **临时目录**: `-Force/`, `-p/`, `echo/`, `mkdir/`
- **创建标记**: `Directories created/`, `Directory creation complete/`
- **异常目录名**: `$null/`, `{`, `}` 等
- **重复目录**: 根目录与 `ai-test-platform/` 内同名目录

---

## 【⭐ V2.5 智能合并策略】

```
重复目录处理:
├── 对比根目录 vs ai-test-platform/ 内目录
├── 分析文件数量、大小、修改时间
├── 决策:
│   ├── 根目录为空 → 直接删除
│   ├── 内部版本更新 → 删除根目录版本
│   └── 根目录有差异 → 合并后删除
└── 执行清理
```

---

## 【快捷指令 V2.5】

- `/cleanup` - 执行自动清理
- `/cleanup dry-run` - 预览清理
- `/cleanup --deep` - **新增**: 深度清理（含文件夹）
- `/cleanup --dirs-only` - **新增**: 仅清理目录

---

## 【同步规则】

**修改本Skill时必须同步更新:**
- [ ] `.clinerules/skills/skill-11-autocleanup.md`
- [ ] `.kimi/skills/auto-cleanup/skill-11-autocleanup.md` (本文件)
- [ ] `.clinerules/USAGE.md`
- [ ] `.kimi/skills/USAGE_GUIDE.md`

================================================================================
*Skill版本: 2.5 | 最后更新: 2026-03-12 | 核心: 文件夹深度清理*
