# bge-m3 Embedding Service Dockerfile
# 基于Python 3.10的轻量级镜像

FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
RUN pip install --no-cache-dir \
    torch==2.1.0 \
    transformers==4.35.0 \
    sentence-transformers==2.2.2 \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    numpy==1.24.3 \
    pydantic==2.5.0

# 预下载bge-m3模型（避免运行时下载）
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"

# 复制应用代码
COPY server.py .

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# 启动命令
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
