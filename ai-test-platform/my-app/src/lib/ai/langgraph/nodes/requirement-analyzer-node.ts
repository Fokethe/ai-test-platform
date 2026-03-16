/**
 * Requirement Analyzer Node
 * LangGraph Node: 分析需求，提取功能点和业务规则
 */

import { AgentState, WorkflowStatus, TestPoint } from '../types';
import { RequirementParser } from '../../agents/requirement-parser';

const parser = new RequirementParser();

/**
 * 需求分析节点
 * 输入: document.content
 * 输出: features, businessRules, testPoints
 */
export async function requirementAnalyzerNode(state: AgentState): Promise<AgentState> {
  try {
    if (!state.document?.content) {
      throw new Error('No document content to analyze');
    }

    // 调用 RequirementParser 解析需求
    const parsed = await parser.parse(state.document.content);

    // 生成测试点（如果还没有）
    const testPoints: TestPoint[] = parsed.testPoints.map((tp, index) => ({
      id: tp.id || `tp-${index + 1}`,
      name: tp.name,
      description: tp.description,
      priority: tp.priority,
      relatedFeature: tp.relatedFeature,
    }));

    return {
      ...state,
      status: WorkflowStatus.RETRIEVING,
      features: parsed.features,
      businessRules: parsed.businessRules,
      testPoints: testPoints.length > 0 ? testPoints : generateDefaultTestPoints(parsed.features),
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Requirement analysis failed';
    
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
 * 生成默认测试点（当解析器没有生成时）
 */
function generateDefaultTestPoints(features: string[]): TestPoint[] {
  const testPoints: TestPoint[] = [];
  
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    
    // 为每个功能点生成4个类型的测试点
    testPoints.push(
      {
        id: `tp-${i + 1}-P`,
        name: `${feature} - 正常流程`,
        description: `验证${feature}的正常操作流程`,
        priority: 'P0',
        relatedFeature: feature,
      },
      {
        id: `tp-${i + 1}-N`,
        name: `${feature} - 异常处理`,
        description: `验证${feature}的异常情况处理`,
        priority: 'P1',
        relatedFeature: feature,
      },
      {
        id: `tp-${i + 1}-B`,
        name: `${feature} - 边界值测试`,
        description: `验证${feature}的边界条件`,
        priority: 'P2',
        relatedFeature: feature,
      },
      {
        id: `tp-${i + 1}-E`,
        name: `${feature} - 边缘场景`,
        description: `验证${feature}的边缘场景和极端情况`,
        priority: 'P3',
        relatedFeature: feature,
      }
    );
  }
  
  return testPoints;
}
