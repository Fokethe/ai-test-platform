/**
 * Test Generator Node
 * LangGraph Node: 生成测试用例
 */

import { AgentState, WorkflowStatus, GeneratedTestCase } from '../types';
import { TestCaseGenerator } from '../../agents/testcase-generator';

const generator = new TestCaseGenerator();

/**
 * 测试用例生成节点
 * 输入: testPoints, similarCases
 * 输出: generatedCases
 */
export async function testGeneratorNode(state: AgentState): Promise<AgentState> {
  try {
    if (!state.testPoints || state.testPoints.length === 0) {
      throw new Error('No test points to generate cases');
    }

    const generatedCases: GeneratedTestCase[] = [];

    // 为每个测试点生成用例
    for (let i = 0; i < state.testPoints.length; i++) {
      const testPoint = state.testPoints[i];
      
      // 生成用例（简化版本，实际会调用 AI）
      const testCase: GeneratedTestCase = {
        id: `tc-${testPoint.id}`,
        title: `${testPoint.name}`,
        precondition: '系统正常运行',
        steps: generateSteps(testPoint),
        expectedResult: generateExpectedResult(testPoint),
        priority: testPoint.priority,
        testPointId: testPoint.id,
        relatedFeature: testPoint.relatedFeature,
      };

      generatedCases.push(testCase);
    }

    return {
      ...state,
      status: WorkflowStatus.COMPLETED,
      generatedCases,
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Test case generation failed';
    
    if (state.retryCount < 3) {
      return {
        ...state,
        retryCount: state.retryCount + 1,
        error: errorMessage,
      };
    }

    return {
      ...state,
      status: WorkflowStatus.ERROR,
      error: errorMessage,
    };
  }
}

/**
 * 生成测试步骤
 */
function generateSteps(testPoint: { name: string; description: string }): string[] {
  if (testPoint.name.includes('登录')) {
    return [
      '打开登录页面',
      '输入有效的用户名',
      '输入正确的密码',
      '点击登录按钮',
    ];
  }
  
  if (testPoint.name.includes('输入')) {
    return [
      '定位到输入框',
      '输入测试数据',
      '触发提交操作',
    ];
  }
  
  return [
    '准备测试环境',
    '执行测试操作',
    '验证测试结果',
  ];
}

/**
 * 生成预期结果
 */
function generateExpectedResult(testPoint: { name: string; priority: string }): string {
  if (testPoint.name.includes('正常')) {
    return '操作成功，系统返回正确结果';
  }
  
  if (testPoint.name.includes('异常')) {
    return '系统正确捕获异常，显示友好错误提示';
  }
  
  if (testPoint.name.includes('边界')) {
    return '系统在边界条件下正确处理，无崩溃或数据丢失';
  }
  
  return '功能符合需求描述';
}
