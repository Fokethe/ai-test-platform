# encoding: utf-8
# -*- coding: utf-8 -*-

# AutoCleanup Skill - 自动清理

## 功能

自动清理项目文件，包括：
- 删除空代码文件（< 50 bytes）
- 删除临时脚本（gen*, create*, write*, temp*）
- 删除临时文件（temp*.txt, test*.txt, output.txt）
- 删除临时目录（-Force/, -p/, [name]/, temp/, test/）
- 删除异常文件名文件
- 将生成的文件分类到正确目录

## 触发方式

- 开发完成后自动触发: "开发完成"、"功能完成"、"代码写好了"
- 测试完成后自动触发: "测试完成"、"测试结束"、"验证通过"
- 手动触发: "/cleanup"、"清理项目"、"整理文件"

## 快捷指令

- `/cleanup` - 执行自动清理
- `/cleanup dry-run` - 预览清理内容（不实际删除）
- `/cleanup --no-git` - 清理但不提交 Git

## 文件分类规则

- 生成的代码文件 → ai-test-platform/src/lib/ai/ 对应目录
- 测试文件 → ai-test-platform/src/__tests__/ 对应目录
- 文档文件 → ai-test-platform/docs/ 对应分类目录
- 过程性文档 → ai-test-platform/docs/99-历史归档/

## 输出

生成清理报告，包含：
- 删除的空代码文件数量
- 删除的临时脚本数量
- 删除的临时文件数量
- 删除的临时目录数量
- 移动的分类文件数量
- 总计释放空间

## 执行流程

1. 扫描项目根目录和子目录
2. 识别空代码文件 (< 50 bytes) → 删除
3. 识别临时文件 (temp*, gen*, create*, write*) → 删除
4. 识别临时目录 (-Force/, -p/, [name]/) → 删除
5. 识别异常文件名 → 删除
6. 识别可分类的生成文件 → 移动到正确位置
7. 生成清理报告
8. Git 提交 (可选)
