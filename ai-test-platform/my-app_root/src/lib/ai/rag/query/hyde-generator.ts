/**
 * HyDE (Hypothetical Document Embeddings) 生成器
 * 通过生成假设性答案文档来提升检索效果
 */

import { VectorStore, VectorResult } from '../retrieval/hybrid-retriever';

/**
 * HyDE 生成策略
 */
export type HyDEStrategy =
  | 'diversity'      // 多样性策略：生成多样化的假设文档
  | 'consistency'    // 一致性策略：生成相似的假设文档
  | 'step_by_step'   // 分步策略：逐步生成假设文档
  | 'few_shot'       // Few-shot 策略：基于示例生成
  | 'zero_shot';     // Zero-shot 策略：直接生成

/**
 * HyDE 结果接口
 */
export interface HyDEResult {
  id: string;
  content: string;
  strategy: HyDEStrategy;
  confidence: number;
  metadata?: {
    timestamp?: number;
    generationTime?: number;
    originalQuery?: string;
    promptTemplate?: string;
    [key: string]: any;
  };
}
// ...