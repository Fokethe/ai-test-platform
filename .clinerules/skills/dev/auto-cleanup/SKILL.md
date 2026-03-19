# encoding: utf-8
# -*- coding: utf-8 -*-

## Skill 11: 自动清理 V2.5 (AutoCleanup) - 深度清理版

【触发方式】: 
- 开发完成后自动触发: "开发完成"、"功能完成"、"代码写好了"
- 测试完成后自动触发: "测试完成"、"测试结束"、"验证通过"
- 手动触发: "/cleanup"、"清理项目"、"整理文件"
- **新增**: "/cleanup --deep"、"深度清理"
- **根目录外溢检测**: 发现文件写入错误位置时自动触发

【核心增强 V2.5】: **文件夹深度清理 + 智能合并策略**

---

## 【清理范围 - 文件类】

1. **空代码文件**: 小于 50 bytes 的 .ts/.js/.tsx/.jsx 文件
2. **临时脚本**: 
   - gen*.js/ts, create*.js/ts, write*.js/ts
   - temp*.js/ts, tmp*.js/ts
3. **临时文本文件**: 
   - temp*.txt, test*.txt, output.txt, test-output.txt
   - 内容仅为简单测试字符串的文件 (如 "hello")
4. **异常文件名**: 
   - 文件名长度 = 1 的特殊字符 ({, }, [, ], $, 等)
   - 文件名包含 $null, undefined 等
   - 文件名包含括号 ( , ) , [ , ]
5. **空测试文件**: 0 bytes 或内容极少的 *.test.ts 文件
6. **测试过程文件** ⭐ V2.5 新增:
   - Playwright 截图: `*.png` (test-results/ 和 playwright-report/ 中的过程截图)
   - Playwright 视频: `*.webm` (测试录制视频)
   - Playwright 报告压缩包: `*.zip` (报告数据包)
   - Jest 过程截图和视频
7. **重复/临时代码文件**:
   - 与主项目目录重复的部分实现 (根目录 src/, my-app/ 等)
   - JSON 格式伪装成 TS 的文件
   - 代码截断的不完整文件

---

## 【⭐ V2.5 新增：文件夹深度清理】

### 清理范围 - 目录类

#### 1. 空目录清理
```typescript
// 识别并删除完全空的文件夹
const emptyDirPatterns = [
  '^empty$',           // 名为 empty 的目录
  '^temp$',            // 名为 temp 的目录（如果为空）
  '^test$'             // 名为 test 的目录（如果为空）
]
```

#### 2. 临时目录识别与清理
```typescript
// 临时目录模式
const tempDirPatterns = [
  // 命令残留目录
  '-Force/',           // PowerShell -Force 残留
  '-p/',               // mkdir -p 残留
  'echo/',             // echo 命令残留
  'mkdir/',            // mkdir 命令残留
  
  // 创建标记目录
  'Directories created/',      // 目录创建标记
  'Directory creation complete/', // 创建完成标记
  
  // 通用临时目录
  'temp/', 'tmp/', 'tempdir/', 'tmpdir/',
  'import/', 'queue/', 'vector/', 'outdated/',
  'cache/', 'logs/'              // 根目录下的缓存/日志（项目内有更合适的）
]
```

#### 3. 异常目录名清理
```typescript
// 异常目录名模式
const abnormalDirPatterns = [
  '^\$null$',          // $null 目录
  '^\$undefined$',     // $undefined 目录
  '^\\$',              // 单字符特殊符号
  '^\)$', '^\($',      // 括号
  '^\]$', '^\[$',      // 方括号
  '^\}$', '^\{$',      // 花括号
  '^0\)$', '^100\)$',  // 数字+括号
  '.*\.length$',       // 包含 .length 的目录名
  '.*\.ts$',           // 以 .ts 结尾的目录名（误创建）
]
```

#### 4. 重复目录检测与合并 ⭐ 核心增强

```typescript
// 根目录 vs ai-test-platform/ 内重复目录检测
const duplicateDirMapping = [
  // 完全重复目录（根目录 vs ai-test-platform/）
  { root: 'src/', target: 'ai-test-platform/src/' },
  { root: 'app/', target: 'ai-test-platform/my-app/src/app/' },
  { root: 'components/', target: 'ai-test-platform/my-app/src/components/' },
  { root: 'lib/', target: 'ai-test-platform/my-app/src/lib/' },
  { root: 'my-app/', target: 'ai-test-platform/my-app/' },
  { root: 'docs/', target: 'ai-test-platform/docs/' },
  { root: 'scripts/', target: 'ai-test-platform/scripts/' },
  { root: 'benchmarks/', target: 'ai-test-platform/benchmarks/' },
  { root: 'data/', target: 'ai-test-platform/data/' },
  { root: 'db/', target: 'ai-test-platform/db/' },
  { root: 'prisma/', target: 'ai-test-platform/prisma/' },
  { root: 'tools/', target: 'ai-test-platform/tools/' },
  { root: '__tests__/', target: 'ai-test-platform/__tests__/' },
  // ⭐ V2.5 新增：_root 后缀的重复目录
  { root: 'my-app_root/', target: 'ai-test-platform/my-app/' },
  { root: 'src_root/', target: 'ai-test-platform/src/' },
]
```

### 智能合并策略

```
重复目录处理流程
│
├── Step 1: 扫描检测
│   ├── 扫描根目录下的所有目录
│   ├── 对比 ai-test-platform/ 内同名目录
│   └── 标记疑似重复目录
│
├── Step 2: 内容对比
│   ├── 对比文件数量
│   ├── 对比文件大小
│   ├── 对比修改时间
│   └── 对比文件内容（抽样）
│
├── Step 3: 智能决策
│   ├── 情况A: 根目录版本为空/极少文件
│   │   └── 决策: 直接删除根目录版本
│   ├── 情况B: ai-test-platform/ 版本更新
│   │   └── 决策: 删除根目录版本
│   ├── 情况C: 根目录版本更新/有差异
│   │   └── 决策: 合并差异文件到 ai-test-platform/，然后删除
│   └── 情况D: 两者都有大量差异
│       └── 决策: 提示用户确认
│
└── Step 4: 执行清理
    ├── 删除确认的重复目录
    ├── 合并需要保留的文件
    └── 记录清理日志
```

---

## 【根目录外溢检测 - V2.5 持续增强】

```
检测范围: 项目根目录全域 (f:/ai-test-platform/ai-test-platform/)
├── 外溢代码文件 → 移到 ai-test-platform/ 对应目录或删除
├── 外溢临时文件 → 删除
├── 外溢临时目录 → 删除 ⭐ V2.5
├── 重复目录结构 → 合并或删除 ⭐ V2.5
├── 空目录 → 删除 ⭐ V2.5
├── 异常目录名 → 清理 ⭐ V2.5
└── 空文件 → 删除
```

**外溢目录识别规则**:
```typescript
// 1. 根目录下的代码目录（应该在 ai-test-platform/ 内）
const overflowDirPatterns = [
  'src/',             // 根目录src vs ai-test-platform/src
  'app/',             // 根目录app vs ai-test-platform/my-app/src/app
  'components/',      // 根目录components vs ai-test-platform内
  'lib/',             // 根目录lib vs ai-test-platform内
  'my-app/',          // 根目录my-app vs ai-test-platform/my-app
  'docs/',            // 根目录docs vs ai-test-platform/docs
  'scripts/',         // 根目录scripts vs ai-test-platform/scripts
  'prisma/',          // 根目录prisma vs ai-test-platform/prisma
  'benchmarks/',      // 根目录benchmarks vs ai-test-platform/benchmarks
  'data/',            // 根目录data vs ai-test-platform/data
  'db/',              // 根目录db vs ai-test-platform/db
  'tools/',           // 根目录tools vs ai-test-platform/tools
  '__tests__/',       // 根目录测试 vs ai-test-platform/__tests__
  // ⭐ V2.5 新增：_root 后缀的重复目录
  'my-app_root/',     // my-app_root vs ai-test-platform/my-app
  'src_root/',        // src_root vs ai-test-platform/src
]

// 2. 临时命令残留目录
const commandResidueDirs = [
  '-Force/',          // PowerShell -Force 参数残留
  '-p/',              // mkdir -p 参数残留
  'echo/',            // echo 命令残留
  'mkdir/',           // mkdir 命令残留
]

// 3. 创建标记目录
const creationMarkerDirs = [
  'Directories created/',
  'Directory creation complete/',
]

// 4. 异常目录名
const abnormalDirNames = [
  '$null', '$undefined',
  '{', '}', '[', ']', '(', ')',
  '0)', '100)', '400).length',
]
```

---

## 【文件分类规则 V2.5】

```
生成的代码文件 → ai-test-platform/src/lib/ai/ 对应目录
测试文件 → ai-test-platform/src/__tests__/ 对应目录
文档文件 → ai-test-platform/docs/ 对应分类目录
过程性文档 → ai-test-platform/docs/99-历史归档/
图片资源 → ai-test-platform/public/ 或 assets/
根目录外溢文件 → 移动到正确位置或删除
根目录外溢目录 → 智能合并或删除 ⭐ V2.5
临时目录 → 删除 ⭐ V2.5
空目录 → 删除 ⭐ V2.5
```

---

## 【执行流程 V2.5】

### 标准清理流程

1. **扫描阶段 - 根目录全域**
   - 扫描项目根目录**全部文件和目录**
   - 扫描 ai-test-platform/ 内部
   - 识别外溢文件和重复目录

2. **文件识别阶段**
   - 识别空代码文件 (< 50 bytes)
   - 识别临时文件 (temp*, gen*, create*, write*, tmp*)
   - 识别临时文本文件 (test*.txt, *output.txt)
   - 识别异常文件名 (长度=1的特殊字符等)
   - 识别根目录外溢文件

3. **目录识别阶段** ⭐ V2.5 增强
   ```
   ├── 空目录扫描
   │   └── 递归检测完全空的文件夹
   ├── 临时目录识别
   │   ├── -Force/, -p/, echo/, mkdir/
   │   ├── Directories created/, Directory creation complete/
   │   └── temp/, tmp/, cache/, logs/
   ├── 异常目录名识别
   │   ├── $null, $undefined
   │   ├── {, }, [, ], (, )
   │   └── 数字+括号组合
   └── 重复目录检测
       ├── 对比根目录 vs ai-test-platform/ 内同名目录
       ├── 分析文件数量、大小、修改时间
       └── 标记需要合并或删除的目录
   ```

4. **外溢处理阶段**
   ```
   ├── 外溢代码文件 → 移动到 ai-test-platform/ 对应目录
   ├── 外溢临时文件 → 直接删除
   ├── 外溢临时目录 → 直接删除 ⭐ V2.5
   ├── 重复目录 → 智能合并策略 ⭐ V2.5
   ├── 空目录 → 删除 ⭐ V2.5
   └── 无法分类的文件 → 提示用户确认
   ```

5. **确认阶段**: 生成清理确认清单，展示给用户确认

6. **执行阶段**: 
   - 删除确认的文件和目录
   - 移动可分类的生成文件到正确位置
   - 合并重复的目录内容
   - 处理根目录外溢文件和目录

7. **验证阶段**: 列出清理后的目录结构，确认清理成功

8. **报告阶段**: 生成详细清理报告

9. **Git 提交** (可选): 自动提交清理变更

### 深度清理流程 (--deep)

```
深度清理模式 (清理力度更强)
│
├── 执行标准清理流程
├── 额外执行:
│   ├── 删除所有 node_modules/ (根目录)
│   ├── 删除所有 .next/ (根目录)
│   ├── 删除所有 coverage/ (根目录)
│   ├── 删除所有 logs/ (根目录)
│   ├── 删除所有 .cache/ (根目录)
│   └── 清理 npm 缓存
└── 提示重新安装依赖
```

---

## 【工作目录自动检查 V2.5】

```
【开发前强制检查】:
1. 检测当前工作目录
2. 如果不在 ai-test-platform/ 内部：
   ⚠️ 警告: "当前在根目录，是否切换到 ai-test-platform/?"
3. 如果用户确认，自动执行: cd ai-test-platform
4. 如检测到外溢文件或目录，提示清理
```

**实现方法**:
```typescript
// 开发前检查当前目录
const currentDir = process.cwd()
const projectRoot = 'f:/ai-test-platform/ai-test-platform'
const correctDir = 'f:/ai-test-platform/ai-test-platform/ai-test-platform'

if (!currentDir.includes('ai-test-platform')) {
  console.warn('⚠️ 当前在根目录，建议切换到 ai-test-platform/')
  console.warn('建议执行: cd ai-test-platform')
}

// 检查是否有文件写入根目录
const rootItems = fs.readdirSync(projectRoot)
const overflowFiles = rootItems.filter(item => {
  // 排除正常文件和目录
  const normalItems = [
    '.git', '.clinerules', '.clinerules.skill-library.md',
    'ai-test-platform', 'README.md', '.env.example', '.env.test',
    '.gitignore', 'package.json', 'package-lock.json',
    'docker-compose.yml', 'tsconfig.json', '.kimi', '.vscode', '.next'
  ]
  return !normalItems.includes(item) && 
         (item.endsWith('.ts') || item.endsWith('.js') || 
          item.endsWith('.txt') || item.endsWith('.json') ||
          // ⭐ V2.5 新增：测试过程文件
          item.endsWith('.png') || item.endsWith('.webm') || 
          item.endsWith('.zip'))
})

// ⭐ V2.5 新增：扫描测试过程文件（Playwright/Jest）
const testArtifactsPatterns = [
  // Playwright 报告目录
  'playwright-report/',
  'test-results/',
  // Jest 截图/视频（如果在项目根目录）
  '__snapshots__/*.png',
  '*.test.png',
  '*.spec.png'
]

// 扫描测试过程文件函数
function scanTestArtifacts(dir: string): string[] {
  const artifacts: string[] = []
  
  // 扫描 playwright-report 目录
  const playwrightReportDir = path.join(dir, 'playwright-report')
  if (fs.existsSync(playwrightReportDir)) {
    const files = glob.sync('**/*.{png,webm,zip}', { cwd: playwrightReportDir })
    artifacts.push(...files.map(f => path.join('playwright-report', f)))
  }
  
  // 扫描 test-results 目录
  const testResultsDir = path.join(dir, 'test-results')
  if (fs.existsSync(testResultsDir)) {
    const files = glob.sync('**/*.{png,webm,zip}', { cwd: testResultsDir })
    artifacts.push(...files.map(f => path.join('test-results', f)))
  }
  
  return artifacts
}

// 检查外溢目录
const overflowDirs = rootItems.filter(item => {
  const stat = fs.statSync(path.join(projectRoot, item))
  if (!stat.isDirectory()) return false
  
  const normalDirs = [
    'ai-test-platform', '.git', '.clinerules', '.kimi', 
    '.vscode', '.next', 'node_modules'
  ]
  if (normalDirs.includes(item)) return false
  
  // 检查是否是重复目录
  const duplicateNames = [
    'src', 'app', 'components', 'lib', 'my-app', 'docs',
    'scripts', 'prisma', 'benchmarks', 'data', 'db', 'tools', '__tests__'
  ]
  return duplicateNames.includes(item) ||
         item.startsWith('-') ||           // -Force, -p
         item === 'echo' ||
         item === 'mkdir' ||
         item.includes('created') ||
         item.includes('creation') ||
         item === '$null' ||
         item === '$undefined'
})

if (overflowFiles.length > 0 || overflowDirs.length > 0) {
  console.warn(`⚠️ 发现 ${overflowFiles.length} 个外溢文件, ${overflowDirs.length} 个外溢目录`)
  console.warn('建议执行: /cleanup')
}
```

---

## 【输出格式 - V2.5】

```
🧹 自动清理报告 V2.5

📊 清理统计:
├─ 删除空代码文件: {n} 个
├─ 删除临时脚本: {n} 个
├─ 删除临时文件: {n} 个
├─ 删除临时目录: {n} 个 ⭐ V2.5
├─ 删除空目录: {n} 个 ⭐ V2.5
├─ 删除测试过程文件: {n} 个 ⭐ V2.5 新增
│   ├─ Playwright 截图: {n} 个 (png)
│   ├─ Playwright 视频: {n} 个 (webm)
│   └─ 报告压缩包: {n} 个 (zip)
├─ 移动分类文件: {n} 个
├─ 处理根目录外溢文件: {n} 个
├─ 处理根目录外溢目录: {n} 个 ⭐ V2.5
│   ├─ 删除重复目录: {n}
│   ├─ 合并重复目录: {n}
│   └─ 删除临时目录: {n}
└─ 总计释放空间: {size}

🔍 根目录外溢详情:
├─ 外溢代码文件:
│   ├─ gen-benchmark.cjs → ai-test-platform/scripts/
│   ├─ temp-create.js → 删除
│   └─ ...
├─ 外溢测试过程文件: ⭐ V2.5 新增
│   ├─ test-results/*.png → 删除
│   ├─ test-results/*.webm → 删除
│   ├─ playwright-report/data/*.zip → 删除
│   └─ ...
├─ 外溢临时目录: ⭐ V2.5
│   ├─ -Force/ → 删除 (PowerShell残留)
│   ├─ -p/ → 删除 (mkdir残留)
│   ├─ echo/ → 删除 (命令残留)
│   ├─ mkdir/ → 删除 (命令残留)
│   ├─ Directories created/ → 删除
│   └─ Directory creation complete/ → 删除
├─ 重复目录处理: ⭐ V2.5
│   ├─ src/ → 与 ai-test-platform/src/ 重复，已合并
│   ├─ components/ → 与 ai-test-platform/my-app/src/components/ 重复，已删除
│   └─ ...
├─ 异常目录名: ⭐ V2.5
│   ├─ $null/ → 删除
│   └─ ...
└─ 空目录清理: ⭐ V2.5
    ├─ empty/ → 删除
    └─ ...

📝 详细清单:
[文件列表...]
[目录列表...]

✅ Git 提交: {commit_hash}
```

---

## 【快捷指令 V2.5】

- `/cleanup` - 执行自动清理（含根目录外溢检测）
- `/cleanup dry-run` - 预览清理内容（不实际删除）
- `/cleanup --no-git` - 清理但不提交 Git
- `/cleanup --root-only` - 仅清理根目录外溢
- `/cleanup --deep` - **新增**: 深度清理（含 node_modules, .next 等）
- `/cleanup --dirs-only` - **新增**: 仅清理目录

---

## 【Git 提交信息模板】

```
chore: 自动清理项目文件 V2.5

- 删除空代码文件 {n} 个
- 删除临时脚本 {n} 个
- 删除临时文件 {n} 个
- 删除临时目录 {n} 个
- 删除空目录 {n} 个
- 删除重复目录 {n} 个
- 合并重复目录 {n} 个
- 移动分类文件 {n} 个
- 处理根目录外溢 {n} 个

自动清理执行时间: {timestamp}
```

---

## 【Skill 更新同步强制规则】

**⚠️ 修改本Skill时必须同步更新:**
- [ ] `.clinerules` (触发关键词/快捷指令)
- [ ] `.clinerules/skills/skill-11-autocleanup.md` (本文件)
- [ ] `.kimi/skills/autocleanup/skill-11-autocleanup.md` (如存在Kimi版本)
- [ ] `.clinerules/USAGE.md` (快捷指令表)
- [ ] 最后更新时间

================================================================================
*Skill版本: 2.5 | 最后更新: 2026-03-19 | 核心增强: 文件夹深度清理 + 智能合并 + 测试过程文件清理*
