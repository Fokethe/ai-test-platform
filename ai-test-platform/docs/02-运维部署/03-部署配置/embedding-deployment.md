# bge-m3 Embedding服务部署指南

## 快速开始

### 1. 使用Docker Compose部署（推荐）

```bash
cd ai-test-platform/my-app/docker/embedding
docker-compose up -d
```

### 2. 验证部署

```bash
# 检查服务状态
curl http://localhost:8000/health

# 测试嵌入
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["测试文本"]}'
```

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- NVIDIA Docker Runtime（GPU支持，可选）
- 内存: 4GB+
- 磁盘: 2GB（模型文件）

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| EMBEDDING_SERVICE_URL | http://localhost:8000 | 服务地址 |
| CUDA_VISIBLE_DEVICES | 0 | GPU设备ID |

## 故障排查

### 服务无法启动
- 检查端口8000是否被占用
- 检查Docker是否正确安装

### GPU不可用
- 确保已安装NVIDIA Docker Runtime
- 检查NVIDIA驱动版本
