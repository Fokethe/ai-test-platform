# AI Test Platform - Git 仓库初始化脚本
# 使用方法: .\scripts\git-init.ps1 -GithubUsername "yourusername"

param(
    [string]$GithubUsername = "",
    [string]$RepoName = "ai-test-platform",
    [string]$Branch = "main"
)

# 颜色设置
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  AI Test Platform - Git 初始化脚本" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# 检查git是否安装
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git 未安装" -ForegroundColor $Red
    Write-Host "请访问 https://git-scm.com/download 下载并安装 Git" -ForegroundColor $Yellow
    exit 1
}
Write-Host "✅ Git 版本: $gitVersion" -ForegroundColor $Green
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json") -and -not (Test-Path "my-app/package.json")) {
    Write-Host "⚠️  警告: 当前目录可能不是项目根目录" -ForegroundColor $Yellow
    $confirm = Read-Host "是否继续? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        exit 0
    }
}

# 获取GitHub用户名
if (-not $GithubUsername) {
    $GithubUsername = Read-Host "请输入您的 GitHub 用户名"
}

# 配置Git用户信息
Write-Host "⚙️  配置 Git 用户信息..." -ForegroundColor $Cyan
$gitEmail = git config user.email
$gitName = git config user.name

if (-not $gitEmail) {
    $email = Read-Host "请输入 Git 邮箱"
    git config user.email "$email"
}
if (-not $gitName) {
    $name = Read-Host "请输入 Git 用户名"
    git config user.name "$name"
}

Write-Host "✅ Git 用户配置完成" -ForegroundColor $Green
Write-Host ""

# 初始化Git仓库（如果不存在）
if (Test-Path ".git") {
    Write-Host "📁 Git 仓库已存在" -ForegroundColor $Yellow
}
else {
    Write-Host "📁 初始化 Git 仓库..." -ForegroundColor $Cyan
    git init
    Write-Host "✅ Git 仓库已初始化" -ForegroundColor $Green
}
Write-Host ""

# 创建 .gitignore
Write-Host "📝 创建 .gitignore..." -ForegroundColor $Cyan
$gitignoreContent = @"
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/
dist/

# Misc
.DS_Store
*.pem
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Turborepo
.turbo/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Prisma
prisma/*.db
prisma/*.db-journal

# Playwright
test-results/
playwright-report/
playwright/.cache/

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
"@

Set-Content ".gitignore" $gitignoreContent
Write-Host "✅ .gitignore 已创建" -ForegroundColor $Green
Write-Host ""

# 添加远程仓库
$remoteExists = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "🌐 远程仓库已存在: $remoteExists" -ForegroundColor $Yellow
    $updateRemote = Read-Host "是否更新远程仓库地址? (y/N)"
    if ($updateRemote -eq 'y' -or $updateRemote -eq 'Y') {
        git remote remove origin
        git remote add origin "https://github.com/$GithubUsername/$RepoName.git"
        Write-Host "✅ 远程仓库已更新" -ForegroundColor $Green
    }
}
else {
    Write-Host "🌐 添加远程仓库..." -ForegroundColor $Cyan
    git remote add origin "https://github.com/$GithubUsername/$RepoName.git"
    Write-Host "✅ 远程仓库已添加" -ForegroundColor $Green
    Write-Host "   URL: https://github.com/$GithubUsername/$RepoName.git" -ForegroundColor $Cyan
}
Write-Host ""

# 创建初始提交
Write-Host "💾 创建初始提交..." -ForegroundColor $Cyan

# 检查是否有提交
$hasCommits = git log --oneline 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  已有提交记录，跳过初始提交" -ForegroundColor $Yellow
}
else {
    git add .
    git commit -m "Initial commit - 项目初始化

- 项目基础架构搭建
- Next.js + React + TypeScript + TailwindCSS
- Prisma + NextAuth 配置
- 基础UI组件和页面"
    Write-Host "✅ 初始提交已创建" -ForegroundColor $Green
}
Write-Host ""

# 创建分支（如果需要）
$currentBranch = git branch --show-current
if ($currentBranch -ne $Branch) {
    Write-Host "🌿 切换到 $Branch 分支..." -ForegroundColor $Cyan
    git checkout -b $Branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout $Branch
    }
    Write-Host "✅ 已切换到 $Branch 分支" -ForegroundColor $Green
}
Write-Host ""

# 显示推送命令
Write-Host "========================================" -ForegroundColor $Green
Write-Host "  ✅ Git 仓库初始化完成!" -ForegroundColor $Green
Write-Host "========================================" -ForegroundColor $Green
Write-Host ""
Write-Host "📌 下一步操作:" -ForegroundColor $Cyan
Write-Host ""
Write-Host "1. 在 GitHub 上创建仓库:" -ForegroundColor $Yellow
Write-Host "   https://github.com/new" -ForegroundColor $Cyan
Write-Host "   仓库名: $RepoName" -ForegroundColor $Cyan
Write-Host ""
Write-Host "2. 推送代码到 GitHub:" -ForegroundColor $Yellow
Write-Host "   git push -u origin $Branch" -ForegroundColor $Cyan
Write-Host ""
Write-Host "3. 后续使用推送脚本:" -ForegroundColor $Yellow
Write-Host "   .\scripts\git-push.ps1 -Message \"提交信息\"" -ForegroundColor $Cyan
Write-Host ""
Write-Host "📚 相关文档:" -ForegroundColor $Cyan
Write-Host "   - 推送日志: docs/99-GIT/PUSH_LOG.md" -ForegroundColor $Cyan
Write-Host "   - 推送脚本: scripts/git-push.ps1" -ForegroundColor $Cyan
Write-Host ""

# 保存配置到文件
$configFile = ".git-config.ps1"
"`$Global:GithubUsername = `"$GithubUsername`"" | Set-Content $configFile
"`$Global:RepoName = `"$RepoName`"" | Add-Content $configFile
"`$Global:Branch = `"$Branch`"" | Add-Content $configFile

Write-Host "⚙️  配置已保存到: $configFile" -ForegroundColor $Cyan
Write-Host ""
