/**
 * Feature Decomposer Node
 * LangGraph Node: 功能拆解，将复杂功能拆分为可测试单元
 */

import { AgentState, WorkflowStatus, TestPoint, BusinessRule } from '../types';

/**
 * 功能拆解节点
 * 输入: features[], businessRules[]
 * 输出: testPoints[] (补充更详细的测试点)
 */
export async function featureDecomposerNode(state: AgentState): Promise<AgentState> {
  try {
    if (!state.features || state.features.length === 0) {
      return {
        ...state,
        testPoints: [],
        error: undefined,
      };
    }

    // 生成测试点
    const newTestPoints = generateTestPoints(state.features, state.businessRules || []);
    
    // 合并已有测试点和新测试点
    const existingPoints = state.testPoints || [];
    const mergedPoints = [...existingPoints, ...newTestPoints];
    
    // 去重（基于功能名称+优先级）
    const uniquePoints = deduplicateTestPoints(mergedPoints);

    return {
      ...state,
      testPoints: uniquePoints,
      status: WorkflowStatus.ANALYZING,
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Feature decomposition failed';
    
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
 * 生成测试点
 */
function generateTestPoints(features: string[], businessRules: BusinessRule[]): TestPoint[] {
  const testPoints: TestPoint[] = [];
  
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const baseId = `tp-${i + 1}`;
    
    // P0: 核心功能测试点
    testPoints.push({
      id: `${baseId}-P0`,
      name: `${feature} - 正常流程`,
      description: `验证${feature}的正常操作流程`,
      priority: 'P0',
      relatedFeature: feature,
    });
    
    // P1: 异常处理测试点
    testPoints.push({
      id: `${baseId}-P1`,
      name: `${feature} - 异常处理`,
      description: `验证${feature}的异常情况处理`,
      priority: 'P1',
      relatedFeature: feature,
    });
    
    // P2: 边界值测试点
    testPoints.push({
      id: `${baseId}-P2`,
      name: `${feature} - 边界值测试`,
      description: `验证${feature}的边界条件`,
      priority: 'P2',
      relatedFeature: feature,
    });
    
    // P3: 边缘场景测试点
    testPoints.push({
      id: `${baseId}-P3`,
      name: `${feature} - 边缘场景`,
      description: `验证${feature}的边缘场景和极端情况`,
      priority: 'P3',
      relatedFeature: feature,
    });
    
    // 根据业务规则生成额外的边界测试点
    const relatedRules = businessRules.filter(rule => 
      rule.description.includes(feature) || 
      isRuleRelatedToFeature(rule, feature)
    );
    
    for (const rule of relatedRules) {
      testPoints.push({
        id: `${baseId}-B-${rule.type}`,
        name: `${feature} - 边界: ${rule.description}`,
        description: `验证业务规则: ${rule.description}`,
        priority: 'P2',
        relatedFeature: feature,
      });
    }
  }
  
  // 如果业务规则很多但没有关联到具体功能，为每个规则生成通用测试点
  if (businessRules.length > 0) {
    for (let j = 0; j < businessRules.length; j++) {
      const rule = businessRules[j];
      const isAlreadyCovered = testPoints.some(tp => 
        tp.description.includes(rule.description)
      );
      
      if (!isAlreadyCovered) {
        testPoints.push({
          id: `tp-rule-${j + 1}`,
          name: `业务规则验证 - ${rule.description}`,
          description: `验证业务规则: ${rule.description}`,
          priority: 'P1',
          relatedFeature: features[0] || '通用',
        });
      }
    }
  }
  
  return testPoints;
}

/**
 * 判断业务规则是否与功能相关
 */
function isRuleRelatedToFeature(rule: BusinessRule, feature: string): boolean {
  // 简单启发式：检查规则描述中是否包含功能关键词
  const featureKeywords = feature.split(/[\s-]/);
  return featureKeywords.some(keyword => 
    keyword.length > 1 && rule.description.includes(keyword)
  );
}

/**
 * 测试点去重
 */
function deduplicateTestPoints(points: TestPoint[]): TestPoint[] {
  const seen = new Set<string>();
  return points.filter(point => {
    const key = `${point.relatedFeature}-${point.priority}-${point.name}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 条件边: 判断是否需要拆解
 * - 功能数量 > 3: 需要拆解
 * - 业务规则数量 > 3: 需要拆解
 * - 否则: 跳过
 */
export function decompositionRouter(state: AgentState): 'decompose' | 'skip' {
  const featureCount = state.features?.length || 0;
  const ruleCount = state.businessRules?.length || 0;
  
  // 复杂条件：功能多或业务规则多
  if (featureCount > 3 || ruleCount > 3) {
    return 'decompose';
  }
  
  return 'skip';
}
