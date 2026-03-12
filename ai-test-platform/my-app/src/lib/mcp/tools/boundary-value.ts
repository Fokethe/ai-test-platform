
/**
 * 边界值分析工具
 * 自动生成边界值测试用例
 */

import { AbstractTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

export interface BoundaryValueInput {
  min: number;
  max: number;
  type: 'integer' | 'float' | 'string_length';
  inclusive?: boolean;
}

export interface BoundaryValueOutput {
  boundaries: Array<{
    value: number;
    type: 'min' | 'max' | 'nominal';
  }>;
  test_values: number[];
  test_cases: Array<{
    input: number;
    expected: 'valid' | 'invalid';
    boundary_type: string;
    description: string;
  }>;
}

export class BoundaryValueTool extends AbstractTool {
  readonly name = 'generate_boundary_values';
  readonly description = '为数值范围生成边界值测试用例';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: '边界值分析工具输入参数',
    properties: {
      min: {
        type: 'number',
        description: '最小值',
      },
      max: {
        type: 'number',
        description: '最大值',
      },
      type: {
        type: 'string',
        description: '数据类型',
        enum: ['integer', 'float', 'string_length'],
      },
      inclusive: {
        type: 'boolean',
        description: '边界是否包含，默认true',
        default: true,
      },
    },
    required: ['min', 'max', 'type'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<BoundaryValueOutput> {
    const { min, max, type, inclusive = true } = input as BoundaryValueInput;

    if (min > max) {
      throw new Error('min must be less than or equal to max');
    }

    const boundaries: BoundaryValueOutput['boundaries'] = [];
    const testValues: number[] = [];
    const testCases: BoundaryValueOutput['test_cases'] = [];

    // 计算名义值（中间值）
    const nominal = Math.floor((min + max) / 2);

    if (type === 'integer' || type === 'string_length') {
      // 整数边界值：min-1, min, min+1, nominal, max-1, max, max+1
      const values = [
        min - 1,
        min,
        min + 1,
        nominal,
        max - 1,
        max,
        max + 1,
      ];

      values.forEach(value => {
        if (!testValues.includes(value)) {
          testValues.push(value);
        }
      });

      // 定义边界
      boundaries.push(
        { value: min, type: 'min' },
        { value: max, type: 'max' },
        { value: nominal, type: 'nominal' }
      );

      // 生成测试用例
      testCases.push(
        {
          input: min - 1,
          expected: 'invalid',
          boundary_type: 'min-1',
          description: `刚好低于最小值 (${min - 1})`,
        },
        {
          input: min,
          expected: 'valid',
          boundary_type: 'min',
          description: `最小值 (${min})`,
        },
        {
          input: min + 1,
          expected: 'valid',
          boundary_type: 'min+1',
          description: `刚好高于最小值 (${min + 1})`,
        },
        {
          input: nominal,
          expected: 'valid',
          boundary_type: 'nominal',
          description: `正常值 (${nominal})`,
        },
        {
          input: max - 1,
          expected: 'valid',
          boundary_type: 'max-1',
          description: `刚好低于最大值 (${max - 1})`,
        },
        {
          input: max,
          expected: 'valid',
          boundary_type: 'max',
          description: `最大值 (${max})`,
        },
        {
          input: max + 1,
          expected: 'invalid',
          boundary_type: 'max+1',
          description: `刚好高于最大值 (${max + 1})`,
        }
      );
    } else {
      // 浮点数边界值
      const epsilon = 0.001;
      const values = [
        min - epsilon,
        min,
        min + epsilon,
        nominal,
        max - epsilon,
        max,
        max + epsilon,
      ];

      values.forEach(value => {
        if (!testValues.includes(value)) {
          testValues.push(value);
        }
      });

      boundaries.push(
        { value: min, type: 'min' },
        { value: max, type: 'max' },
        { value: nominal, type: 'nominal' }
      );

      testCases.push(
        {
          input: min - epsilon,
          expected: 'invalid',
          boundary_type: 'min-epsilon',
          description: `刚好低于最小值 (${min - epsilon})`,
        },
        {
          input: min,
          expected: 'valid',
          boundary_type: 'min',
          description: `最小值 (${min})`,
        },
        {
          input: min + epsilon,
          expected: 'valid',
          boundary_type: 'min+epsilon',
          description: `刚好高于最小值 (${min + epsilon})`,
        },
        {
          input: nominal,
          expected: 'valid',
          boundary_type: 'nominal',
          description: `正常值 (${nominal})`,
        },
        {
          input: max - epsilon,
          expected: 'valid',
          boundary_type: 'max-epsilon',
          description: `刚好低于最大值 (${max - epsilon})`,
        },
        {
          input: max,
          expected: 'valid',
          boundary_type: 'max',
          description: `最大值 (${max})`,
        },
        {
          input: max + epsilon,
          expected: 'invalid',
          boundary_type: 'max+epsilon',
          description: `刚好高于最大值 (${max + epsilon})`,
        }
      );
    }

    return {
      boundaries,
      test_values: testValues,
      test_cases: testCases,
    };
  }
}