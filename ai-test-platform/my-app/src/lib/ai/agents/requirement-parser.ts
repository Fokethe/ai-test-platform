/**
 * RequirementParser Agent
 * 需求解析 Agent - 将需求文本解析为功能点和测试点
 * 
 * 核心职责：
 * 1. 解析需求文本，提取功能点列表
 * 2. 识别业务规则（长度、时间、次数等约束）
 * 3. 基于功能点生成测试点（正向/反向/边界/边缘）
 */

// 常量定义
const MIN_REQUIREMENT_LENGTH = 5;
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;

// 类型定义
export type Priority = typeof PRIORITIES[number];

export type BusinessRuleType = 'length' | 'time' | 'limit' | 'range' | 'format' | 'other';

export interface BusinessRule {
  type: BusinessRuleType;
  description: string;
  value?: string;
}

export interface TestPoint {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  relatedFeature: string;
}

export interface ParsedRequirement {
  rawText: string;
  features: string[];
  businessRules: BusinessRule[];
  testPoints: TestPoint[];
}

// 测试点类型配置
interface TestPointTypeConfig {
  suffix: string;
  priority: Priority;
  descriptionTemplate: string;
}

const TEST_POINT_TYPES: TestPointTypeConfig[] = [
  { suffix: 'P', priority: 'P0', descriptionTemplate: '验证{feature}的正常操作流程' },
  { suffix: 'N', priority: 'P1', descriptionTemplate: '验证{feature}的异常情况处理' },
  { suffix: 'B', priority: 'P2', descriptionTemplate: '验证{feature}的边界条件' },
  { suffix: 'E', priority: 'P3', descriptionTemplate: '验证{feature}的边缘场景和极端情况' },
];

export class RequirementParser {
  /**
   * 解析需求文本
   * @param requirement - 原始需求文本
   * @returns 解析后的需求结构
   * @throws 当需求为空或过短时抛出错误
   */
  async parse(requirement: string): Promise<ParsedRequirement> {
    this.validateRequirement(requirement);

    const rawText = requirement.trim();
    
    // 并行执行提取和生成操作
    const [features, businessRules] = await Promise.all([
      this.extractFeatures(rawText),
      this.extractBusinessRules(rawText),
    ]);
    
    // 基于功能点生成测试点
    const testPoints = await this.generateTestPoints(features);
    
    return {
      rawText,
      features,
      businessRules,
      testPoints,
    };
  }

  /**
   * 验证需求文本
   */
  private validateRequirement(requirement: string): void {
    if (!requirement || requirement.trim() === '') {
      throw new Error('需求不能为空');
    }
    
    if (requirement.trim().length < MIN_REQUIREMENT_LENGTH) {
      throw new Error('需求描述过短');
    }
  }

  /**
   * 从需求文本中提取功能点
   */
  private extractFeatures(text: string): string[] {
    const features: string[] = [];
    
    // 按行分割并清理
    const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // 匹配数字列表项 (1. 2. 3. 等)
      const numberedMatch = line.match(/^\d+[.、]\s*(.+)$/);
      if (numberedMatch) {
        features.push(numberedMatch[1]);
        continue;
      }
      
      // 匹配功能描述（包含"支持"、"可以"等关键词）
      if (line.includes('支持') || line.includes('可以') || line.includes('能够')) {
        // 提取关键词后的内容
        const featureMatch = line.match(/(?:支持|可以|能够)([^，。]+)/);
        if (featureMatch) {
          features.push(featureMatch[1].trim());
        }
      }
    }
    
    // 如果没有提取到功能点，将整个文本作为一个功能点
    if (features.length === 0) {
      // 提取主要功能描述（通常是前半句）
      const mainFeature = text.split(/[，。]/)[0];
      if (mainFeature) {
        features.push(mainFeature.trim());
      }
    }
    
    return features;
  }

  /**
   * 提取业务规则
   */
  async extractBusinessRules(text: string): Promise<BusinessRule[]> {
    const rules: BusinessRule[] = [];
    
    // 长度规则：X位、X个字符、长度X-Y
    const lengthMatches = text.match(/(\d+)[位个字符]/g);
    if (lengthMatches) {
      for (const match of lengthMatches) {
        const value = match.match(/(\d+)/)?.[1];
        if (value) {
          rules.push({
            type: 'length',
            description: `长度为${value}`,
            value,
          });
        }
      }
    }
    
    // 范围规则：X-Y位、X到Y个
    const rangeMatch = text.match(/(\d+)[-到](\d+)[位个]/);
    if (rangeMatch) {
      rules.push({
        type: 'range',
        description: `长度范围${rangeMatch[1]}-${rangeMatch[2]}`,
        value: `${rangeMatch[1]}-${rangeMatch[2]}`,
      });
    }
    
    // 时间规则：X分钟、X小时、X天
    const timeMatches = text.match(/(\d+)[分钟小时天秒]/g);
    if (timeMatches) {
      for (const match of timeMatches) {
        rules.push({
          type: 'time',
          description: `时间限制${match}`,
          value: match,
        });
      }
    }
    
    // 次数限制：最多X次、X次机会、限制X次
    const limitMatch = text.match(/(?:最多|限制|)(\d+)[次个]/);
    if (limitMatch) {
      rules.push({
        type: 'limit',
        description: `次数限制${limitMatch[1]}`,
        value: limitMatch[1],
      });
    }
    
    return rules;
  }

  /**
   * 基于功能点生成测试点
   */
  async generateTestPoints(features: string[]): Promise<TestPoint[]> {
    const testPoints: TestPoint[] = [];
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      // 为每个功能点生成正向测试点（P0）
      testPoints.push({
        id: `TP-${i + 1}-P`,
        name: `${feature} - 正常流程`,
        description: `验证${feature}的正常操作流程`,
        priority: 'P0',
        relatedFeature: feature,
      });
      
      // 生成反向测试点（P1）
      testPoints.push({
        id: `TP-${i + 1}-N`,
        name: `${feature} - 异常处理`,
        description: `验证${feature}的异常情况处理`,
        priority: 'P1',
        relatedFeature: feature,
      });
      
      // 生成边界测试点（P2）
      testPoints.push({
        id: `TP-${i + 1}-B`,
        name: `${feature} - 边界值测试`,
        description: `验证${feature}的边界条件`,
        priority: 'P2',
        relatedFeature: feature,
      });
      
      // 生成边缘场景测试点（P3）
      testPoints.push({
        id: `TP-${i + 1}-E`,
        name: `${feature} - 边缘场景`,
        description: `验证${feature}的边缘场景和极端情况`,
        priority: 'P3',
        relatedFeature: feature,
      });
    }
    
    return testPoints;
  }
}
