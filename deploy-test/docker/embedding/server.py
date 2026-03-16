"""
bge-m3 Embedding Service
基于FastAPI的本地嵌入服务
"""

import os
import time
import torch
from typing import List, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# 初始化FastAPI应用
app = FastAPI(
    title="bge-m3 Embedding Service",
    description="本地bge-m3嵌入模型服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型实例
model = None
device = None

# 请求/响应模型
class EmbedRequest(BaseModel):
    texts: List[str]
    normalize: bool = True

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    model: str
    device: str
    latency_ms: float

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    version: str

@app.on_event("startup")
async def load_model():
    """启动时加载模型"""
    global model, device
    
    print("正在加载bge-m3模型...")
    start_time = time.time()
    
    # 检测设备
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"使用设备: {device}")
    
    # 加载模型
    model = SentenceTransformer('BAAI/bge-m3', device=device)
    
    load_time = time.time() - start_time
    print(f"模型加载完成，耗时: {load_time:.2f}秒")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查端点"""
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    return HealthResponse(
        status="healthy",
        model="BAAI/bge-m3",
        device=device,
        version="1.0.0"
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """
    批量文本嵌入接口
    
    - **texts**: 要嵌入的文本列表
    - **normalize**: 是否归一化向量（默认True）
    """
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    if not request.texts:
        raise HTTPException(status_code=400, detail="文本列表不能为空")
    
    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="单次最多支持100条文本")
    
    start_time = time.time()
    
    try:
        # 生成嵌入
        embeddings = model.encode(
            request.texts,
            normalize_embeddings=request.normalize,
            convert_to_numpy=True
        )
        
        latency = (time.time() - start_time) * 1000
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimensions=len(embeddings[0]),
            model="BAAI/bge-m3",
            device=device,
            latency_ms=round(latency, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"嵌入生成失败: {str(e)}")

@app.post("/embed/single")
async def embed_single(text: str, normalize: bool = True):
    """单条文本嵌入（简化接口）"""
    result = await embed_texts(EmbedRequest(texts=[text], normalize=normalize))
    return {
        "embedding": result.embeddings[0],
        "dimensions": result.dimensions,
        "latency_ms": result.latency_ms
    }

@app.get("/info")
async def model_info():
    """获取模型信息"""
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    return {
        "model": "BAAI/bge-m3",
        "dimensions": 1024,
        "device": device,
        "max_batch_size": 100,
        "normalize_default": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
