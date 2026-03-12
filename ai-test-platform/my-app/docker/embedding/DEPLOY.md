# encoding: utf-8
# -*- coding: utf-8 -*-

# bge-m3 Embedding Service 部署指南

> **版本**: v1.0  
> **适用系统**: Windows 10/11, Linux, macOS  
> **模型**: BAAI/bge-m3 (1024维)  

---

## 📋 环境要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **操作系统** | Windows 10 / Ubuntu 20.04 | Windows 11 / Ubuntu 22.04 |
| **Python** | 3.9+ | 3.10 |
| **内存** | 8GB | 16GB+ |
| **存储** | 10GB 可用空间 | 20GB SSD |
| **GPU** | 可选 (CPU可用) | NVIDIA GPU (CUDA 11.8+) |
| **网络** | 首次下载需要 | - |

---

## 🚀 快速部署

### 方式一: Windows 一键部署（推荐）

```powershell
# 以管理员身份运行 PowerShell
cd ai-test-platform/my-app/docker/embedding
.\setup-windows.ps1
```

脚本会自动完成:
- ✅ Python 环境检查/安装
- ✅ 虚拟环境创建
- ✅ 依赖包安装
- ✅ 模型下载
- ✅ 服务启动

### 方式二: 手动部署

#### 步骤 1: 安装 Python 3.10+

```bash
# Windows: 从官网下载安装
# https://www.python.org/downloads/release/python-31011/

# Linux/Ubuntu
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# macOS
brew install python@3.10
```

#### 步骤 2: 创建虚拟环境

```bash
cd ai-test-platform/my-app/docker/embedding

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate

# Linux/macOS:
source .venv/bin/activate
```

#### 步骤 3: 安装依赖

```bash
# 使用国内镜像加速
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 安装依赖
pip install torch==2.1.0 transformers==4.35.0 sentence-transformers==2.2.2
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 numpy==1.24.3 pydantic==2.5.0
```

#### 步骤 4: 下载模型

```bash
# 设置镜像（国内网络推荐）
export HF_ENDPOINT=https://hf-mirror.com  # Linux/macOS
set HF_ENDPOINT=https://hf-mirror.com     # Windows

# Python 下载模型
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
```

#### 步骤 5: 启动服务

```bash
# 启动服务
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
```

---

## 🐳 Docker 部署（可选）

如果已安装 Docker:

```bash
cd ai-test-platform/my-app/docker/embedding

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## ✅ 验证部署

### 健康检查

```bash
curl http://localhost:8000/health
```

预期响应:
```json
{
  "status": "healthy",
  "model": "BAAI/bge-m3",
  "device": "cpu",
  "version": "1.0.0"
}
```

### 嵌入测试

```bash
# 单条文本嵌入
curl -X POST "http://localhost:8000/embed/single" \
  -H "Content-Type: application/json" \
  -d '{"text": "这是一个测试文本"}'

# 批量文本嵌入
curl -X POST "http://localhost:8000/embed" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["文本1", "文本2", "文本3"]}'
```

### 性能测试

```bash
# 使用提供的测试脚本
python benchmark.py
```

---

## 🔧 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|-------|------|
| `CUDA_VISIBLE_DEVICES` | `0` | GPU设备号，CPU运行设为`-1` |
| `PORT` | `8000` | 服务端口号 |
| `WORKERS` | `1` | 工作进程数 |
| `HF_ENDPOINT` | - | HuggingFace镜像地址 |

### 服务参数

```bash
# 指定端口启动
python -m uvicorn server:app --host 0.0.0.0 --port 8080

# 多进程模式（需要更多内存）
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## 📊 性能指标

### 响应时间

| 场景 | CPU | GPU |
|------|-----|-----|
| 单条文本 | 50-100ms | 10-20ms |
| 10条批量 | 200-500ms | 50-100ms |
| 100条批量 | 2-5s | 0.5-1s |

### 资源占用

| 配置 | 内存 | 磁盘 |
|------|------|------|
| 仅CPU | 2-4GB | 2GB |
| GPU模式 | 4-6GB | 2GB |

---

## 🐛 常见问题

### Q1: 模型下载慢/失败

**解决方案:**
```bash
# 使用国内镜像
export HF_ENDPOINT=https://hf-mirror.com

# 或者手动下载
# 从 https://hf-mirror.com/BAAI/bge-m3 下载模型文件
# 放置到 ~/.cache/torch/sentence_transformers/
```

### Q2: 内存不足

**解决方案:**
```bash
# 使用量化模型（如果有）
# 或降低批处理大小

# 修改 server.py 中的限制
MAX_BATCH_SIZE = 50  # 从100降低到50
```

### Q3: CUDA out of memory

**解决方案:**
```bash
# 强制使用CPU
export CUDA_VISIBLE_DEVICES=-1

# 或者限制GPU内存
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

### Q4: 端口被占用

```bash
# 查找占用8000端口的进程
netstat -ano | findstr :8000

# 使用其他端口启动
python -m uvicorn server:app --port 8080
```

---

## 🔌 API 接口文档

### 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/info` | GET | 模型信息 |
| `/embed` | POST | 批量文本嵌入 |
| `/embed/single` | POST | 单条文本嵌入 |

### 详细说明

#### POST /embed

批量文本嵌入接口

**请求体:**
```json
{
  "texts": ["文本1", "文本2"],
  "normalize": true
}
```

**响应:**
```json
{
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "dimensions": 1024,
  "model": "BAAI/bge-m3",
  "device": "cpu",
  "latency_ms": 45.23
}
```

---

## 📝 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-03-09 | 初始版本，支持Windows本地部署 |

---

## 📞 支持

遇到问题？请检查:
1. 本部署文档
2. `AI_ARCHITECTURE_OPTIMIZATION_PLAN.md` 完整计划
3. 项目 `progress.md` 进度记录
