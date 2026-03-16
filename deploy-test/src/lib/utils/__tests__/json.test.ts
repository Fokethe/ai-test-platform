/**
 * JSON 工具函数测试
 */

import { safeJsonParse, safeJsonStringify } from '../json';

describe('safeJsonParse', () => {
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

  it('应该正确处理 JSON 对象', () => {
    const json = '{"name": "test", "value": 123}';
    const result = safeJsonParse<Record<string, unknown>>(json, {});
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('应该正确处理数字', () => {
    const result = safeJsonParse<number>('42', 0);
    expect(result).toBe(42);
  });

  it('应该正确处理布尔值', () => {
    const result = safeJsonParse<boolean>('true', false);
    expect(result).toBe(true);
  });
});

describe('safeJsonStringify', () => {
  it('应该正确序列化对象', () => {
    const obj = { name: 'test', value: 123 };
    const result = safeJsonStringify(obj);
    expect(result).toBe('{"name":"test","value":123}');
  });

  it('应该正确序列化数组', () => {
    const arr = ['tag1', 'tag2'];
    const result = safeJsonStringify(arr);
    expect(result).toBe('["tag1","tag2"]');
  });

  it('循环引用时应该返回空字符串', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj; // 循环引用
    const result = safeJsonStringify(obj);
    expect(result).toBe('');
  });
});

describe('资产标签解析场景', () => {
  it('修复: 原始代码会因空白字符串崩溃', () => {
    // 证明原始代码会崩溃
    const whitespaceTags = '   ';
    expect(() => {
      if (whitespaceTags) {
        JSON.parse(whitespaceTags);
      }
    }).toThrow('Unexpected end of JSON input');

    // safeJsonParse 可以安全处理
    expect(safeJsonParse<string[]>(whitespaceTags, [])).toEqual([]);
  });

  it('修复: 原始代码会因无效 JSON 崩溃', () => {
    // 证明原始代码会崩溃
    const invalidTags = 'tag1, tag2, tag3';
    expect(() => {
      if (invalidTags) {
        JSON.parse(invalidTags);
      }
    }).toThrow();

    // safeJsonParse 可以安全处理
    expect(safeJsonParse<string[]>(invalidTags, [])).toEqual([]);
  });

  it('修复后的代码可以正确解析标签', () => {
    // 模拟修复后的 useEffect 逻辑
    const assetTags = '["需求", "设计", "API"]';
    const tags = safeJsonParse<string[]>(assetTags, []);
    const formTags = tags.join(', ');
    expect(formTags).toBe('需求, 设计, API');
  });

  it('修复后的代码处理空标签', () => {
    // 各种空值情况
    expect(safeJsonParse<string[]>(undefined, []).join(', ')).toBe('');
    expect(safeJsonParse<string[]>('', []).join(', ')).toBe('');
    expect(safeJsonParse<string[]>(null, []).join(', ')).toBe('');
    expect(safeJsonParse<string[]>('   ', []).join(', ')).toBe('');
  });
});
