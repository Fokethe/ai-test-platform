/**
 * Task Runner - 测试任务执行器
 */

import { prisma } from './prisma';

export interface TestResult {
  testCaseId: string;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  duration?: number;
  errorMessage?: string;
}

export const TaskRunner = {
  /**
   * 执行测试用例列表
   */
  async executeTestCases(
    testCaseIds: string[],
    runId: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCaseId of testCaseIds) {
      try {
        // 获取测试用例详情
        const testCase = await prisma.testCase.findUnique({
          where: { id: testCaseId },
        });

        if (!testCase) {
          results.push({
            testCaseId,
            status: 'ERROR',
            errorMessage: 'Test case not found',
          });
          continue;
        }

        // TODO: 调用 Playwright 执行实际测试
        // 目前模拟执行结果
        const mockResult = await this.mockExecute(testCase);

        // 更新执行记录
        await prisma.testExecution.updateMany({
          where: {
            runId,
            testCaseId,
          },
          data: {
            status: mockResult.status,
            duration: mockResult.duration,
            errorMessage: mockResult.errorMessage,
            completedAt: new Date(),
          },
        });

        results.push(mockResult);
      } catch (error) {
        results.push({
          testCaseId,
          status: 'ERROR',
          errorMessage: (error as Error).message,
        });
      }
    }

    return results;
  },

  /**
   * 模拟执行（用于开发和测试）
   */
  async mockExecute(testCase: { id: string; name: string }): Promise<TestResult> {
    // 模拟执行时间 100-1000ms
    const duration = Math.floor(Math.random() * 900) + 100;
    
    // 模拟 80% 通过率
    const passed = Math.random() > 0.2;

    return {
      testCaseId: testCase.id,
      status: passed ? 'PASSED' : 'FAILED',
      duration,
      errorMessage: passed ? undefined : 'Assertion failed: expected true but got false',
    };
  },
};
