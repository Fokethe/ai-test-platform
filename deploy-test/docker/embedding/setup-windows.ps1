# encoding: utf-8
# -*- coding: utf-8 -*-

<#
.SYNOPSIS
    bge-m3 Embedding Service Windows 部署脚本
.DESCRIPTION
    自动安装Python环境、依赖并启动bge-m3嵌入服务
#>

param(
    [switch]$SkipPythonInstall,
    [switch]$SkipModelDownload,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  bge-m3 Embedding Service 部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "建议以管理员权限运行此脚本"
}

# 步骤1: 检查/安装Python
Write-Host "[步骤 1/5] 检查 Python 环境..." -ForegroundColor Yellow

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}

if (-not $pythonCmd) {
    if ($SkipPythonInstall) {
        Write-Error "未找到Python，请手动安装Python 3.10+ 或移除 -SkipPythonInstall 参数"
        exit 1
    }
    
    Write-Host "未检测到Python，开始下载安装..." -ForegroundColor Yellow
    
    # 下载Python 3.10
    $pythonUrl = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe"
    $pythonInstaller = "$env:TEMP\python-3.10.11-amd64.exe"
    
    Write-Host "下载 Python 3.10..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller
    
    Write-Host "安装 Python（请等待）..." -ForegroundColor Yellow
    Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1" -Wait
    
    # 刷新环境变量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Write-Host "Python 安装完成" -ForegroundColor Green
} else {
    $pythonVersion = & $pythonCmd.Source --version
    Write-Host "✓ 检测到 $pythonVersion" -ForegroundColor Green
}

# 步骤2: 创建虚拟环境
Write-Host "`n[步骤 2/5] 创建 Python 虚拟环境..." -ForegroundColor Yellow

$venvPath = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venvPath)) {
    python -m venv $venvPath
    Write-Host "✓ 虚拟环境创建完成" -ForegroundColor Green
} else {
    Write-Host "✓ 虚拟环境已存在" -ForegroundColor Green
}

# 激活虚拟环境
Write-Host "激活虚拟环境..." -ForegroundColor Yellow
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$venvPip = Join-Path $venvPath "Scripts\pip.exe"

# 步骤3: 安装依赖
Write-Host "`n[步骤 3/5] 安装 Python 依赖..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间..." -ForegroundColor Gray

# 使用清华镜像加速
& $venvPip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 安装依赖
$requirements = @"
torch==2.1.0
transformers==4.35.0
sentence-transformers==2.2.2
fastapi==0.104.1
uvicorn[standard]==0.24.0
numpy==1.24.3
pydantic==2.5.0
requests==2.31.0
"@

$reqFile = Join-Path $env:TEMP "requirements.txt"
$requirements | Out-File -FilePath $reqFile -Encoding UTF8

& $venvPip install -r $reqFile

Write-Host "✓ 依赖安装完成" -ForegroundColor Green

# 步骤4: 预下载模型
if (-not $SkipModelDownload) {
    Write-Host "`n[步骤 4/5] 预下载 bge-m3 模型..." -ForegroundColor Yellow
    Write-Host "模型大小约2GB，下载时间取决于网络速度..." -ForegroundColor Gray
    
    $modelScript = @"
import os
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
from sentence_transformers import SentenceTransformer
print('开始下载 bge-m3 模型...')
model = SentenceTransformer('BAAI/bge-m3')
print('模型下载完成！')
"@
    
    $modelScript | & $venvPython -
    
    Write-Host "✓ 模型下载完成" -ForegroundColor Green
} else {
    Write-Host "`n[步骤 4/5] 跳过模型下载" -ForegroundColor Gray
}

# 步骤5: 启动服务
Write-Host "`n[步骤 5/5] 启动 bge-m3 Embedding 服务..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  服务启动中..." -ForegroundColor Cyan
Write-Host "  访问地址: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  健康检查: http://localhost:$Port/health" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$serverScript = Join-Path $PSScriptRoot "server.py"
& $venvPython -m uvicorn server:app --host 0.0.0.0 --port $Port --workers 1

Write-Host "`n服务已停止" -ForegroundColor Yellow
