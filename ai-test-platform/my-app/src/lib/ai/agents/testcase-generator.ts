/**
 * TestCaseGenerator Agent
 * 基于测试点生成详细测试用例
 * TDD Round 6 实现
 */

import { generateWithAI } from '../client';

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
}

export interface BatchGenerationOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
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
}
