# AI Test Platform - Git 推送脚本
# 使用方法: .\scripts\git-push.ps1 -Message "提交信息"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [string]$Branch = "main",
    
    [switch]$CreateTag,
    [string]$TagName = "",
    [string]$TagMessage = ""
)

# 颜色设置
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  AI Test Platform - Git 推送脚本" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# 检查是否在git仓库中
$gitStatus = git status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: 当前目录不是Git仓库" -ForegroundColor $Red
    Write-Host "请先运行: git init" -ForegroundColor $Yellow
    exit 1
}

# 显示当前分支
$currentBranch = git branch --show-current
Write-Host "📍 当前分支: $currentBranch" -ForegroundColor $Cyan
Write-Host "📝 提交信息: $Message" -ForegroundColor $Cyan
Write-Host ""

# 检查远程仓库
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  警告: 未设置远程仓库" -ForegroundColor $Yellow
    Write-Host "请设置远程仓库:"
    Write-Host "  git remote add origin https://github.com/yourusername/ai-test-platform.git"
    Write-Host ""
}
else {
    Write-Host "🌐 远程仓库: $remoteUrl" -ForegroundColor $Cyan
}

# 显示变更文件
Write-Host "📁 变更文件:" -ForegroundColor $Cyan
$status = git status --short
if ($status) {
    $status | ForEach-Object { Write-Host "  $_" }
}
else {
    Write-Host "  (无变更)" -ForegroundColor $Yellow
}
Write-Host ""

# 确认推送
$confirm = Read-Host "确认推送? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ 已取消" -ForegroundColor $Red
    exit 0
}

Write-Host ""
Write-Host "🚀 开始推送..." -ForegroundColor $Cyan
Write-Host ""

# 添加所有变更
Write-Host "➕ 添加变更到暂存区..." -ForegroundColor $Cyan
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 添加变更失败" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ 变更已添加" -ForegroundColor $Green
Write-Host ""

# 提交
Write-Host "💾 创建提交..." -ForegroundColor $Cyan
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  没有需要提交的变更，或提交失败" -ForegroundColor $Yellow
    exit 0
}
Write-Host "✅ 提交已创建" -ForegroundColor $Green

# 获取commit hash
$commitHash = git rev-parse --short HEAD
Write-Host "📌 Commit: $commitHash" -ForegroundColor $Cyan
Write-Host ""

# 创建标签（如果需要）
if ($CreateTag) {
    if (-not $TagName) {
        $TagName = Read-Host "输入标签名 (例如: v0.1.0)"
    }
    if (-not $TagMessage) {
        $TagMessage = $Message
    }
    
    Write-Host "🏷️  创建标签: $TagName..." -ForegroundColor $Cyan
    git tag -a $TagName -m "$TagMessage"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 标签已创建" -ForegroundColor $Green
    }
    else {
        Write-Host "❌ 标签创建失败" -ForegroundColor $Red
    }
    Write-Host ""
}

# 推送到远程
Write-Host "☁️  推送到远程仓库..." -ForegroundColor $Cyan
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 推送失败" -ForegroundColor $Red
    Write-Host "请检查远程仓库设置和网络连接" -ForegroundColor $Yellow
    exit 1
}
Write-Host "✅ 推送成功" -ForegroundColor $Green
Write-Host ""

# 推送标签（如果有）
if ($CreateTag) {
    Write-Host "☁️  推送标签到远程..." -ForegroundColor $Cyan
    git push origin $TagName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 标签已推送" -ForegroundColor $Green
    }
    Write-Host ""
}

# 更新PUSH_LOG.md
$pushLogFile = "docs/99-GIT/PUSH_LOG.md"
if (Test-Path $pushLogFile) {
    Write-Host "📝 更新 PUSH_LOG.md..." -ForegroundColor $Cyan
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $pushNumber = (Select-String -Path $pushLogFile -Pattern "### Push #" | Measure-Object).Count + 1
    
    $logEntry = @"

### Push #$pushNumber - $timestamp

**提交信息**: $Message

**Commit Hash**: $commitHash

**分支**: $Branch

**变更摘要**:
- [ ] 新增功能
- [ ] Bug修复
- [ ] 文档更新
- [ ] 性能优化
- [ ] 其他

**详细变更**:
| 类型 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `...` | 待补充 |

**回退方法**:
```bash
git reset --hard $commitHash
git push -f origin $Branch
```

**备注**:
- 使用脚本自动推送

---

"@
    
    # 在"## 📝 推送记录"后插入新记录
    $content = Get-Content $pushLogFile -Raw
    $insertMarker = "## 📝 推送记录"
    $newContent = $content -replace $insertMarker, ($insertMarker + $logEntry)
    Set-Content $pushLogFile $newContent
    
    Write-Host "✅ PUSH_LOG.md 已更新" -ForegroundColor $Green
    Write-Host ""
}

# 完成
Write-Host "========================================" -ForegroundColor $Green
Write-Host "  ✅ 推送完成!" -ForegroundColor $Green
Write-Host "========================================" -ForegroundColor $Green
Write-Host ""
Write-Host "查看提交:" -ForegroundColor $Cyan
git log -1 --oneline
Write-Host ""

# 显示提示
Write-Host "📌 提示:" -ForegroundColor $Yellow
Write-Host "  - 如需回退: git reset --hard $commitHash" -ForegroundColor $Yellow
Write-Host "  - 查看日志: git log --oneline -10" -ForegroundColor $Yellow
Write-Host "  - 查看状态: git status" -ForegroundColor $Yellow
Write-Host ""
