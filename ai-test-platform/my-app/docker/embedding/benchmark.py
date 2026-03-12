# encoding: utf-8
# -*- coding: utf-8 -*-

"""
bge-m3 Embedding Service 性能测试脚本

用法:
    python benchmark.py              # 完整测试
    python benchmark.py --quick      # 快速测试
    python benchmark.py --host http://localhost:8000  # 指定服务地址
"""

import time
import json
import argparse
import statistics
from typing import List, Dict
import requests


class EmbeddingBenchmark:
    """Embedding服务性能测试器"""
    
    def __init__(self, host: str = "http://localhost:8000"):
        self.host = host.rstrip('/')
        self.results: List[Dict] = []
        
    def check_health(self) -> bool:
        """检查服务健康状态"""
        try:
            response = requests.get(f"{self.host}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✓ 服务健康: {data['model']} @ {data['device']}")
                return True
            else:
                print(f"✗ 服务异常: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ 连接失败: {e}")
            return False
    
    def benchmark_single(self, iterations: int = 10) -> Dict:
        """测试单条文本嵌入性能"""
        print(f"\n[单条文本嵌入测试] 迭代{iterations}次...")
        
        latencies = []
        test_text = "这是一个测试文本，用于评估嵌入服务的性能。"
        
        for i in range(iterations):
            start = time.time()
            try:
                response = requests.post(
                    f"{self.host}/embed/single",
                    json={"text": test_text},
                    timeout=30
                )
                latency = (time.time() - start) * 1000
                latencies.append(latency)
                
                if response.status_code != 200:
                    print(f"  请求{i+1}失败: {response.status_code}")
                    
            except Exception as e:
                print(f"  请求{i+1}异常: {e}")
        
        if not latencies:
            return {"error": "所有请求失败"}
        
        result = {
            "test": "单条文本嵌入",
            "iterations": len(latencies),
            "min_ms": round(min(latencies), 2),
            "max_ms": round(max(latencies), 2),
            "avg_ms": round(statistics.mean(latencies), 2),
            "median_ms": round(statistics.median(latencies), 2),
            "p95_ms": round(sorted(latencies)[int(len(latencies)*0.95)], 2),
        }
        
        print(f"  平均延迟: {result['avg_ms']}ms")
        print(f"  P95延迟: {result['p95_ms']}ms")
        
        return result
    
    def benchmark_batch(self, batch_sizes: List[int] = [10, 50, 100]) -> List[Dict]:
        """测试批量嵌入性能"""
        results = []
        
        for batch_size in batch_sizes:
            print(f"\n[批量嵌入测试] batch_size={batch_size}...")
            
            # 生成测试文本
            texts = [f"这是第{i}条测试文本，用于批量嵌入性能测试。" for i in range(batch_size)]
            
            start = time.time()
            try:
                response = requests.post(
                    f"{self.host}/embed",
                    json={"texts": texts},
                    timeout=60
                )
                total_latency = (time.time() - start) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    
                    result = {
                        "test": f"批量嵌入({batch_size}条)",
                        "batch_size": batch_size,
                        "total_ms": round(total_latency, 2),
                        "per_item_ms": round(total_latency / batch_size, 2),
                        "dimensions": data.get("dimensions", 1024),
                    }
                    
                    print(f"  总延迟: {result['total_ms']}ms")
                    print(f"  单条平均: {result['per_item_ms']}ms")
                    
                    results.append(result)
                else:
                    print(f"  请求失败: {response.status_code}")
                    print(f"  响应: {response.text[:200]}")
                    
            except Exception as e:
                print(f"  请求异常: {e}")
        
        return results
    
    def benchmark_concurrent(self, concurrency: int = 5, iterations: int = 10) -> Dict:
        """测试并发性能（简化版，顺序执行）"""
        print(f"\n[并发测试] 并发{concurrency}个请求，共{iterations}次...")
        
        import concurrent.futures
        
        test_text = "并发测试文本"
        latencies = []
        
        def make_request():
            start = time.time()
            try:
                response = requests.post(
                    f"{self.host}/embed/single",
                    json={"text": test_text},
                    timeout=30
                )
                return (time.time() - start) * 1000
            except:
                return None
        
        # 使用线程池模拟并发
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(make_request) for _ in range(iterations)]
            
            for future in concurrent.futures.as_completed(futures):
                latency = future.result()
                if latency:
                    latencies.append(latency)
        
        if not latencies:
            return {"error": "所有请求失败"}
        
        result = {
            "test": f"并发测试({concurrency}线程)",
            "concurrency": concurrency,
            "iterations": len(latencies),
            "avg_ms": round(statistics.mean(latencies), 2),
            "max_ms": round(max(latencies), 2),
        }
        
        print(f"  平均延迟: {result['avg_ms']}ms")
        print(f"  最大延迟: {result['max_ms']}ms")
        
        return result
    
    def run_full_benchmark(self) -> Dict:
        """运行完整性能测试"""
        print("=" * 60)
        print("  bge-m3 Embedding Service 性能测试")
        print("=" * 60)
        
        # 1. 健康检查
        if not self.check_health():
            return {"error": "服务未就绪"}
        
        # 2. 单条测试
        single_result = self.benchmark_single(iterations=20)
        
        # 3. 批量测试
        batch_results = self.benchmark_batch(batch_sizes=[10, 50, 100])
        
        # 4. 并发测试
        concurrent_result = self.benchmark_concurrent(concurrency=3, iterations=15)
        
        # 汇总结果
        all_results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "host": self.host,
            "tests": [single_result] + batch_results + [concurrent_result],
        }
        
        # 打印汇总
        print("\n" + "=" * 60)
        print("  测试结果汇总")
        print("=" * 60)
        for test in all_results["tests"]:
            if "error" not in test:
                print(f"\n{test['test']}:")
                for key, value in test.items():
                    if key != "test":
                        print(f"  {key}: {value}")
        
        return all_results
    
    def run_quick_benchmark(self) -> Dict:
        """运行快速测试"""
        print("=" * 60)
        print("  bge-m3 Embedding Service 快速测试")
        print("=" * 60)
        
        # 健康检查
        if not self.check_health():
            return {"error": "服务未就绪"}
        
        # 快速测试
        single_result = self.benchmark_single(iterations=5)
        batch_results = self.benchmark_batch(batch_sizes=[10])
        
        return {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "host": self.host,
            "tests": [single_result] + batch_results,
        }


def main():
    parser = argparse.ArgumentParser(description="bge-m3 Embedding Service 性能测试")
    parser.add_argument("--host", default="http://localhost:8000", help="服务地址")
    parser.add_argument("--quick", action="store_true", help="快速测试模式")
    parser.add_argument("--output", help="输出结果到JSON文件")
    
    args = parser.parse_args()
    
    benchmark = EmbeddingBenchmark(host=args.host)
    
    if args.quick:
        results = benchmark.run_quick_benchmark()
    else:
        results = benchmark.run_full_benchmark()
    
    # 保存结果
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n结果已保存到: {args.output}")
    
    print("\n" + "=" * 60)
    print("  测试完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
