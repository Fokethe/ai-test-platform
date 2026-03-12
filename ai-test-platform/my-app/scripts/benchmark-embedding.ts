/**
 * Embedding Benchmark Script
 * 嵌入服务性能基准测试
 */

import { performance } from 'perf_hooks';
import { LocalEmbeddingService } from '../src/lib/ai/embeddings/local-embedding';

interface BenchmarkResult {
  name: string;
  totalTime: number;
  avgTime: number;
  throughput: number; // items/sec
  success: boolean;
  error?: string;
}

// 测试数据
const TEST_TEXTS = {
  short: ['测试文本', 'Hello World', '测试用例生成'],
  medium: Array(10).fill(null).map((_, i) => `这是一个中等长度的测试文本，用于测试第${i}个用例的生成性能`),
  long: Array(5).fill(null).map((_, i) => `这是一个较长的测试文本，包含了更多的上下文信息和详细描述，用于测试长文本的嵌入性能。这是第${i}个测试用例。`)
};

async function benchmarkLocalEmbedding(): Promise<BenchmarkResult[]> {
  const service = new LocalEmbeddingService({
    baseUrl: process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000',
    timeout: 60000,
    maxRetries: 1
  });

  const results: BenchmarkResult[] = [];

  // 检查服务是否可用
  const healthy = await service.health();
  if (!healthy) {
    console.error('本地嵌入服务不可用，请确保服务已启动');
    return [{
      name: 'local-embedding',
      totalTime: 0,
      avgTime: 0,
      throughput: 0,
      success: false,
      error: '服务不可用'
    }];
  }

  // 测试单条短文本
  console.log('测试: 单条短文本...');
  const shortResult = await runBenchmark('local-short', async () => {
    return service.embed('这是一个测试文本');
  }, 10);
  results.push(shortResult);

  // 测试3条短文本批量
  console.log('测试: 3条短文本批量...');
  const batch3Result = await runBenchmark('local-batch-3', async () => {
    return service.embedBatch(TEST_TEXTS.short);
  }, 10);
  results.push(batch3Result);

  // 测试10条中等文本批量
  console.log('测试: 10条中等文本批量...');
  const batch10Result = await runBenchmark('local-batch-10', async () => {
    return service.embedBatch(TEST_TEXTS.medium);
  }, 5);
  results.push(batch10Result);

  return results;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<any>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let success = true;
  let error: string | undefined;

  try {
    // 预热
    await fn();
    
    // 正式测试
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / times.length;

  return {
    name,
    totalTime: Math.round(totalTime),
    avgTime: Math.round(avgTime * 100) / 100,
    throughput: Math.round(1000 / avgTime * 100) / 100,
    success,
    error
  };
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n========== Embedding Benchmark Results ==========\n');
  
  for (const result of results) {
    console.log(`测试: ${result.name}`);
    console.log(`  状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    if (result.error) {
      console.log(`  错误: ${result.error}`);
    } else {
      console.log(`  总耗时: ${result.totalTime}ms`);
      console.log(`  平均耗时: ${result.avgTime}ms`);
      console.log(`  吞吐量: ${result.throughput} items/sec`);
    }
    console.log('');
  }
}

async function main() {
  console.log('开始Embedding性能基准测试...\n');
  
  const results = await benchmarkLocalEmbedding();
  printResults(results);
  
  // 保存结果到文件
  const fs = require('fs');
  const outputDir = './benchmarks';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = `${outputDir}/embedding-benchmark-${timestamp}.json`;
  
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    results
  }, null, 2));
  
  console.log(`结果已保存到: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { benchmarkLocalEmbedding };
