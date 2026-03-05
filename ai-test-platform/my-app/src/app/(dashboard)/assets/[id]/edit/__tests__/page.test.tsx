/**
 * EditAssetPage 测试
 * 测试 JSON 解析错误修复
 */

import { describe, it, expect } from '@jest/globals';
import { safeJsonParse } from '@/lib/utils/json';

describe('safeJsonParse 工具函数', () => {
  it('应该正确解析有效的 JSON 字符串数组', () => {
    const tags = '["tag1", "tag2", "tag3"]';
    const result = safeJsonParse<string[]>(tags, []);
    expect(result).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('应该返回默认值当传入 undefined', () => {
    const result = safeJsonParse<string[]>(undefined, []);
    expect(result).toEqual([]);
  });

  it('应该返回默认值当传入空字符串', () => {
    const result = safeJsonParse<string[]>('', []);
    expect(result).toEqual([]);
  });

  it('应该返回默认值当传入 null', () => {
    const result = safeJsonParse<string[]>(null, []);
    expect(result).toEqual([]);
  });

  it('应该返回默认值当传入无效 JSON', () => {
    const invalidJson = 'not a json string';
    const result = safeJsonParse<string[]>(invalidJson, []);
    expect(result).toEqual([]);
  });

  it('应该返回默认值当传入空白字符串', () => {
    const whitespaceTags = '   ';
    const result = safeJsonParse<string[]>(whitespaceTags, []);
    expect(result).toEqual([]);
  });

  it('应该正确连接标签为逗号分隔字符串', () => {
    const tags = '["需求", "设计", "API"]';
    const parsed = safeJsonParse<string[]>(tags, []);
    const result = parsed.join(', ');
    expect(result).toBe('需求, 设计, API');
  });

  it('空数组应该返回空字符串', () => {
    const tags: string[] = [];
    const result = tags.join(', ');
    expect(result).toBe('');
  });

  it('应该处理数字类型的默认值', () => {
    const result = safeJsonParse<number>('invalid', 0);
    expect(result).toBe(0);
  });

  it('应该处理对象类型的默认值', () => {
    interface Config {
      enabled: boolean;
      count: number;
    }
    const defaultConfig: Config = { enabled: false, count: 0 };
    const result = safeJsonParse<Config>('invalid', defaultConfig);
    expect(result).toEqual({ enabled: false, count: 0 });
  });
});

describe('标签解析边界情况 - 原始代码行为', () => {
  it('原始代码会因空白字符串而崩溃', () => {
    // 模拟原始代码的行为
    const whitespaceTags = '   ';
    expect(() => {
      if (whitespaceTags) {
        JSON.parse(whitespaceTags);
      }
    }).toThrow('Unexpected end of JSON input');
  });

  it('原始代码会因无效 JSON 而崩溃', () => {
    const invalidTags = 'tag1, tag2, tag3'; // 不是有效的 JSON 数组格式
    expect(() => {
      if (invalidTags) {
        JSON.parse(invalidTags);
      }
    }).toThrow();
  });

  it('safeJsonParse 可以安全处理这些边界情况', () => {
    // 空白字符串
    expect(safeJsonParse('   ', [])).toEqual([]);
    // 无效 JSON
    expect(safeJsonParse('tag1, tag2, tag3', [])).toEqual([]);
    // 正常 JSON
    expect(safeJsonParse('["tag1", "tag2"]', [])).toEqual(['tag1', 'tag2']);
  });
});
