/**
 * 安全的 JSON 解析工具
 * 提供带错误处理的 JSON 解析和数据库字段解析功能
 */

/**
 * 安全解析 JSON 字符串
 * @param jsonString 要解析的 JSON 字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的值或默认值
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn("JSON parse error:", error);
    return defaultValue;
  }
}

/**
 * 安全字符串化 JSON
 * @param value 要 stringify 的值
 * @param defaultValue 失败时的默认值
 * @returns JSON 字符串或默认值
 */
export function safeJsonStringify(
  value: unknown,
  defaultValue: string = "{}"
): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn("JSON stringify error:", error);
    return defaultValue;
  }
}

/**
 * 安全解析数据库字段（处理可能的 JSON 字符串或对象）
 * @param field 数据库字段值
 * @param defaultValue 默认值
 * @returns 解析后的值
 */
export function safeParseDbField<T>(
  field: string | object | null | undefined,
  defaultValue: T
): T {
  if (!field) return defaultValue;
  
  // 如果已经是对象，直接返回
  if (typeof field === "object") return field as T;
  
  // 尝试解析 JSON 字符串
  return safeJsonParse<T>(field, defaultValue);
}

/**
 * 安全解析数组字段
 * @param field 数组字段值
 * @param defaultValue 默认值
 * @returns 解析后的数组
 */
export function safeParseArrayField<T>(
  field: string | T[] | null | undefined,
  defaultValue: T[] = []
): T[] {
  if (!field) return defaultValue;
  
  if (Array.isArray(field)) return field;
  
  return safeJsonParse<T[]>(field, defaultValue);
}

/**
 * 安全解析对象字段
 * @param field 对象字段值
 * @param defaultValue 默认值
 * @returns 解析后的对象
 */
export function safeParseObjectField<T extends object>(
  field: string | T | null | undefined,
  defaultValue: T = {} as T
): T {
  return safeParseDbField<T>(field, defaultValue);
}

/**
 * 安全字符串化存储到数据库
 * @param value 要存储的值
 * @returns 可存储的字符串
 */
export function safeStringifyForDb(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return safeJsonStringify(value);
}
