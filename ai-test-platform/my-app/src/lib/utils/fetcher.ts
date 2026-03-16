/**
 * 安全的fetcher工具
 * 处理API错误和非JSON响应
 */

export async function safeFetcher(url: string) {
  const res = await fetch(url);
  
  // 检查HTTP状态
  if (!res.ok) {
    throw new Error(`API错误: ${res.status} ${res.statusText}`);
  }
  
  // 检查Content-Type
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`API返回非JSON数据: ${text.substring(0, 100)}`);
  }
  
  return res.json();
}

// 用于SWR的fetcher
export const swrFetcher = (url: string) => safeFetcher(url);
