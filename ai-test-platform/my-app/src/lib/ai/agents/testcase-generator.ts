/**
 * TestCaseGenerator Agent
 * 基于测试点生成详细测试用例
 * TDD Round 6 实现
 * TDD Round 11 新增 RAG 集成
 */

import { generateWithAI } from '../client';
import { retrieveSimilarTestCases, RetrievalOptions as RAGOptions } from '../rag/retrieval';

export interface TestPoint {
  id: string;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  relatedFeature: string;
}

export interface GeneratedTestCase {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  testPointId: string;
  relatedFeature: string;
}

export interface BusinessRule {
  type: string;
  description: string;
  value?: string;
}

export interface GenerationContext {
  businessRules?: BusinessRule[];
  features?: string[];
  useRAG?: boolean;
}

export interface BatchGenerationOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface RAGGenerationOptions extends RAGOptions {
  knowledgeBase?: any[];
}

export class TestCaseGenerator {
  /**
   * 基于单个测试点生成用例
   */
  async generateFromTestPoint(
    testPoint: TestPoint,
    context?: GenerationContext
  ): Promise<GeneratedTestCase[]> {
    try {
      const prompt = this.buildPrompt(testPoint, context);
      const response = await generateWithAI(prompt);

      return this.parseResponse(response, testPoint);
    } catch (error) {
      if (error instanceof Error && error.message.includes('AI')) {
        throw new Error('用例生成失败: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * 基于多个测试点批量生成用例
   */
  async generateFromTestPoints(
    testPoints: TestPoint[],
    options?: BatchGenerationOptions
  ): Promise<GeneratedTestCase[]> {
    const results: GeneratedTestCase[] = [];
    const total = testPoints.length;
    const concurrency = options?.concurrency || 3;

    // 分批处理控制并发
    for (let i = 0; i < total; i += concurrency) {
      const batch = testPoints.slice(i, i + concurrency);
      const batchPromises = batch.map(async (testPoint) => {
        const testCases = await this.generateFromTestPoint(testPoint);
        return testCases;
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((testCases) => results.push(...testCases));

      // 报告进度
      if (options?.onProgress) {
        options.onProgress(Math.min(i + concurrency, total), total);
      }
    }

    return results;
  }

  /**
   * 构建生成提示词
   */
  private buildPrompt(testPoint: TestPoint, context?: GenerationContext): string {
    let prompt = `你是一位专业的软件测试工程师，擅长基于测试点设计详细的测试用例。

请基于以下测试点信息，生成详细的测试用例：

## 测试点信息
- 名称: ${testPoint.name}
- 描述: ${testPoint.description}
- 优先级: ${testPoint.priority}
- 关联功能: ${testPoint.relatedFeature}
`;

    // 添加业务规则上下文
    if (context?.businessRules && context.businessRules.length > 0) {
      prompt += '\n## 业务规则\n';
      context.businessRules.forEach((rule) => {
        prompt += `- [${rule.type}] ${rule.description}\n`;
      });
    }

    // 添加功能点上下文
    if (context?.features && context.features.length > 0) {
      prompt += '\n## 相关功能点\n';
      context.features.forEach((feature) => {
        prompt += `- ${feature}\n`;
      });
    }

    prompt += `
## 生成要求
1. 为每个测试点生成1-3条测试用例（覆盖正例和反例）
2. 用例必须包含：标题、前置条件、测试步骤、预期结果
3. 测试步骤必须是具体的、可执行的操作指令
4. 预期结果必须是可验证的、明确的结果描述
5. 保持测试点的优先级

## 输出格式
请以 JSON 格式输出，结构如下:
{
  "testCases": [
    {
      "title": "用例标题",
      "precondition": "前置条件",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "expectedResult": "预期结果描述",
      "priority": "P0/P1/P2/P3"
    }
  ]
}

请确保输出是有效的 JSON 格式，不要包含 markdown 代码块标记。`;

    return prompt;
  }

  /**
   * 解析 AI 响应
   */
  private parseResponse(response: string, testPoint: TestPoint): GeneratedTestCase[] {
    try {
      // 尝试提取 JSON 部分
      let jsonStr = response.trim();

      // 移除 markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
        throw new Error('响应格式错误: 缺少 testCases 数组');
      }

      return parsed.testCases.map((tc: any, index: number) => ({
        id: `TC-${testPoint.id}-${index + 1}`,
        title: tc.title || '未命名用例',
        precondition: tc.precondition || '',
        steps: Array.isArray(tc.steps) ? tc.steps : [],
        expectedResult: tc.expectedResult || '',
        priority: tc.priority || testPoint.priority,
        testPointId: testPoint.id,
        relatedFeature: testPoint.relatedFeature,
      }));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('解析生成结果失败: 无效的 JSON 格式');
      }
      throw error;
    }
  }

  // ==================== RAG 集成方法 (TDD Round 11) ====================

  /**
   * 基于测试点生成用例（带 RAG 知识库检索）
   * 先检索相似历史用例作为 Few-shot 示例，再生成新用例
   */
  async generateFromTestPointWithRAG(
    testPoint: TestPoint,
    knowledgeBase: any[],
    options?: RAGGenerationOptions
  ): Promise<GeneratedTestCase[]> {
    // 调用 RAG 检索获取相似用例
    const similarCases = await retrieveSimilarTestCases(
      testPoint,
      knowledgeBase,
      {
        maxResults: options?.maxResults || 3,
        minSimilarity: options?.minSimilarity || 0.5,
      }
    );

    // 构建包含 Few-shot 示例的提示词
    const prompt = this.buildPromptWithFewShot(testPoint, knowledgeBase, similarCases);

    // 调用 AI 生成
    const response = await generateWithAI(prompt);

    return this.parseResponse(response, testPoint);
  }

  /**
   * 构建包含 Few-shot 示例的提示词
   * @param testPoint 测试点
   * @param knowledgeBase 知识库（用于检索）
   * @param similarCases 检索到的相似用例（可选，如未提供会自动检索）
   */
  async buildPromptWithFewShot(
    testPoint: TestPoint,
    knowledgeBase: any[],
    similarCases?: { testCase: any; similarity: number }[],
    options?: RAGOptions
  ): Promise<string> {
    let prompt = `你是一位专业的软件测试工程师，擅长基于测试点设计详细的测试用例。\n`;

    // 如果没有传入相似用例，自动检索
    let casesToUse = similarCases;
    if (!casesToUse) {
      casesToUse = await retrieveSimilarTestCases(
        testPoint,
        knowledgeBase,
        {
          maxResults: options?.maxResults || 3,
          minSimilarity: options?.minSimilarity || 0.5,
        }
      );
    }

    // 如果有相似用例，添加 Few-shot 示例
    if (casesToUse && casesToUse.length > 0) {
      prompt += `\n## 参考示例（历史相似用例）\n`;
      
      // 限制最多 3 条示例
      const limitedCases = casesToUse.slice(0, 3);
      
      limitedCases.forEach((item, index) => {
        const tc = item.testCase;
        const similarityPercent = Math.round(item.similarity * 100);
        
        prompt += `\n### 示例 ${index + 1}（相似度 ${similarityPercent}%）\n`;
        prompt += `- 标题: ${tc.title}\n`;
        prompt += `- 前置条件: ${tc.precondition}\n`;
        prompt += `- 测试步骤:\n`;
        tc.steps.forEach((step: string, i: number) => {
          prompt += `  ${i + 1}. ${step}\n`;
        });
        prompt += `- 预期结果: ${tc.expectedResult}\n`;
      });

      prompt += `\n请参考以上示例的风格和结构，为当前测试点生成新的测试用例。\n`;
    }

    // 添加测试点信息
    prompt += `\n## 测试点信息\n`;
    prompt += `- 名称: ${testPoint.name}\n`;
    prompt += `- 描述: ${testPoint.description}\n`;
    prompt += `- 优先级: ${testPoint.priority}\n`;
    prompt += `- 关联功能: ${testPoint.relatedFeature}\n`;

    prompt += `\n## 生成要求\n`;
    prompt += `1. 为每个测试点生成1-3条测试用例（覆盖正例和反例）\n`;
    prompt += `2. 用例必须包含：标题、前置条件、测试步骤、预期结果\n`;
    prompt += `3. 测试步骤必须是具体的、可执行的操作指令\n`;
    prompt += `4. 预期结果必须是可验证的、明确的结果描述\n`;
    prompt += `5. 保持测试点的优先级\n`;
    if (similarCases && similarCases.length > 0) {
      prompt += `6. 参考示例用例的风格，但针对当前测试点的具体场景\n`;
    }

    prompt += `\n## 输出格式\n`;
    prompt += `请以 JSON 格式输出，结构如下:\n`;
    prompt += `{\n`;
    prompt += `  "testCases": [\n`;
    prompt += `    {\n`;
    prompt += `      "title": "用例标题",\n`;
    prompt += `      "precondition": "前置条件",\n`;
    prompt += `      "steps": ["步骤1", "步骤2", "步骤3"],\n`;
    prompt += `      "expectedResult": "预期结果描述",\n`;
    prompt += `      "priority": "P0/P1/P2/P3"\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n`;
    prompt += `\n请确保输出是有效的 JSON 格式，不要包含 markdown 代码块标记。`;

    return prompt;
  }

  /**
   * 批量生成用例（带 RAG 知识库检索）
   * 为每个测试点分别检索相似用例并生成
   */
  async generateFromTestPointsWithRAG(
    testPoints: TestPoint[],
    knowledgeBase: any[],
    options?: BatchGenerationOptions & RAGGenerationOptions
  ): Promise<GeneratedTestCase[]> {
    const results: GeneratedTestCase[] = [];
    const total = testPoints.length;
    const concurrency = options?.concurrency || 3;

    // 分批处理控制并发
    for (let i = 0; i < total; i += concurrency) {
      const batch = testPoints.slice(i, i + concurrency);
      const batchPromises = batch.map(async (testPoint) => {
        // 每个测试点单独检索相似用例
        const testCases = await this.generateFromTestPointWithRAG(
          testPoint,
          knowledgeBase,
          {
            maxResults: options?.maxResults,
            minSimilarity: options?.minSimilarity,
          }
        );
        return testCases;
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((testCases) => results.push(...testCases));

      // 报告进度
      if (options?.onProgress) {
        options.onProgress(Math.min(i + concurrency, total), total);
      }
    }

    return results;
  }
}
