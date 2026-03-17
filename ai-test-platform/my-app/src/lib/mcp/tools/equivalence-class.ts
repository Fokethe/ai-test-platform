
/**
 * 等价类划分工具
 * 自动生成有效和无效等价类
 */

import { AbstractTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

export interface EquivalenceClassInput {
  condition: string;
  type: 'input' | 'output' | 'rule';
  data_type?: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum_values?: string[];
  };
}

export interface EquivalenceClassOutput {
  valid_classes: Array<{
    id: string;
    description: string;
    examples: unknown[];
  }>;
  invalid_classes: Array<{
    id: string;
    description: string;
    examples: unknown[];
  }>;
  test_cases: Array<{
    input: unknown;
    expected: string;
    class_id: string;
    type: 'valid' | 'invalid';
  }>;
}

export class EquivalenceClassTool extends AbstractTool {
  readonly name = 'generate_equivalence_classes';
  readonly description = '为输入条件生成功能等价类';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: '等价类划分工具输入参数',
    properties: {
      condition: {
        type: 'string',
        description: '条件描述，如"用户名长度2-20字符"',
      },
      type: {
        type: 'string',
        description: '条件类型',
        enum: ['input', 'output', 'rule'],
      },
      data_type: {
        type: 'string',
        description: '数据类型',
        enum: ['string', 'number', 'date', 'boolean', 'enum'],
      },
      constraints: {
        type: 'object',
        description: '约束条件',
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
          pattern: { type: 'string' },
          enum_values: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    required: ['condition', 'type'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<EquivalenceClassOutput> {
    const { condition, data_type = 'string', constraints = {} } = input as EquivalenceClassInput;
    
    const validClasses: EquivalenceClassOutput['valid_classes'] = [];
    const invalidClasses: EquivalenceClassOutput['invalid_classes'] = [];
    const testCases: EquivalenceClassOutput['test_cases'] = [];

    // 根据数据类型生成等价类
    switch (data_type) {
      case 'string':
        this.generateStringClasses(condition, constraints, validClasses, invalidClasses, testCases);
        break;
      case 'number':
        this.generateNumberClasses(condition, constraints, validClasses, invalidClasses, testCases);
        break;
      case 'boolean':
        this.generateBooleanClasses(validClasses, invalidClasses, testCases);
        break;
      case 'enum':
        this.generateEnumClasses(constraints, validClasses, invalidClasses, testCases);
        break;
      default:
        this.generateStringClasses(condition, constraints, validClasses, invalidClasses, testCases);
    }

    return {
      valid_classes: validClasses,
      invalid_classes: invalidClasses,
      test_cases: testCases,
    };
  }

  private generateStringClasses(
    condition: string,
    constraints: { min?: number; max?: number; pattern?: string },
    validClasses: EquivalenceClassOutput['valid_classes'],
    invalidClasses: EquivalenceClassOutput['invalid_classes'],
    testCases: EquivalenceClassOutput['test_cases']
  ): void {
    const min = constraints.min ?? 0;
    const max = constraints.max ?? 100;

    // 有效等价类
    validClasses.push({
      id: 'EC1',
      description: `有效长度：${min}-${max}字符`,
      examples: [this.generateString(min), this.generateString(Math.floor((min + max) / 2)), this.generateString(max)],
    });

    // 无效等价类
    if (min > 0) {
      invalidClasses.push({
        id: 'EC2',
        description: `长度不足：小于${min}字符`,
        examples: ['', this.generateString(Math.max(0, min - 1))],
      });
    }
    
    invalidClasses.push({
      id: 'EC3',
      description: `长度超出：大于${max}字符`,
      examples: [this.generateString(max + 1)],
    });

    // 生成测试用例
    testCases.push(
      { input: this.generateString(min), expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: this.generateString(Math.floor((min + max) / 2)), expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: this.generateString(max), expected: 'valid', class_id: 'EC1', type: 'valid' }
    );
    
    if (min > 0) {
      testCases.push(
        { input: '', expected: 'invalid', class_id: 'EC2', type: 'invalid' },
        { input: this.generateString(min - 1), expected: 'invalid', class_id: 'EC2', type: 'invalid' }
      );
    }
    
    testCases.push(
      { input: this.generateString(max + 1), expected: 'invalid', class_id: 'EC3', type: 'invalid' }
    );
  }

  private generateNumberClasses(
    condition: string,
    constraints: { min?: number; max?: number },
    validClasses: EquivalenceClassOutput['valid_classes'],
    invalidClasses: EquivalenceClassOutput['invalid_classes'],
    testCases: EquivalenceClassOutput['test_cases']
  ): void {
    const min = constraints.min ?? 0;
    const max = constraints.max ?? 100;

    validClasses.push({
      id: 'EC1',
      description: `有效范围：${min}-${max}`,
      examples: [min, Math.floor((min + max) / 2), max],
    });

    invalidClasses.push(
      {
        id: 'EC2',
        description: `小于最小值：小于${min}`,
        examples: [min - 1],
      },
      {
        id: 'EC3',
        description: `大于最大值：大于${max}`,
        examples: [max + 1],
      }
    );

    testCases.push(
      { input: min, expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: Math.floor((min + max) / 2), expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: max, expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: min - 1, expected: 'invalid', class_id: 'EC2', type: 'invalid' },
      { input: max + 1, expected: 'invalid', class_id: 'EC3', type: 'invalid' }
    );
  }

  private generateBooleanClasses(
    validClasses: EquivalenceClassOutput['valid_classes'],
    invalidClasses: EquivalenceClassOutput['invalid_classes'],
    testCases: EquivalenceClassOutput['test_cases']
  ): void {
    validClasses.push(
      { id: 'EC1', description: '布尔值：true', examples: [true] },
      { id: 'EC2', description: '布尔值：false', examples: [false] }
    );

    invalidClasses.push({
      id: 'EC3',
      description: '非布尔值',
      examples: ['true', 1, null],
    });

    testCases.push(
      { input: true, expected: 'valid', class_id: 'EC1', type: 'valid' },
      { input: false, expected: 'valid', class_id: 'EC2', type: 'valid' }
    );
  }

  private generateEnumClasses(
    constraints: { enum_values?: string[] },
    validClasses: EquivalenceClassOutput['valid_classes'],
    invalidClasses: EquivalenceClassOutput['invalid_classes'],
    testCases: EquivalenceClassOutput['test_cases']
  ): void {
    const values = constraints.enum_values || ['value1', 'value2'];

    values.forEach((value, index) => {
      validClasses.push({
        id: `EC${index + 1}`,
        description: `枚举值：${value}`,
        examples: [value],
      });
      testCases.push({ input: value, expected: 'valid', class_id: `EC${index + 1}`, type: 'valid' });
    });

    invalidClasses.push({
      id: `EC${values.length + 1}`,
      description: '无效枚举值',
      examples: ['invalid_value'],
    });
    testCases.push({ input: 'invalid_value', expected: 'invalid', class_id: `EC${values.length + 1}`, type: 'invalid' });
  }

  private generateString(length: number): string {
    if (length <= 0) return '';
    return 'a'.repeat(length);
  }
}