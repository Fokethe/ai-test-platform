/**
 * JSON 工具函数
 */

/**
 * 安全地解析 JSON 字符串
 * 如果解析失败或输入为空，返回默认值
 * 
 * @param json - 要解析的 JSON 字符串
 * @param defaultValue - 解析失败时返回的默认值
 * @returns 解析后的值或默认值
 * 
 * @example
 * safeJsonParse<string[]>('["tag1", "tag2"]', []) // ['tag1', 'tag2']
 * safeJsonParse<string[]>('', []) // []
 * safeJsonParse<string[]>('invalid', []) // []
 * safeJsonParse<string[]>(undefined, []) // []
 */
export function safeJsonParse<T>(json: string | undefined | null, defaultValue: T): T {
  if (!json || typeof json !== 'string') return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 将值安全地序列化为 JSON 字符串
 * 如果序列化失败，返回空字符串
 * 
 * @param value - 要序列化的值
 * @returns JSON 字符串或空字符串
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
