/**
 * 安全JSON解析工具
 * 修复: 使用 try-catch 包装 JSON.parse，防止服务器崩溃
 */

export interface SafeJsonParseResult<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * 安全地解析JSON字符串
 * @param jsonString 要解析的JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析结果对象
 */
export function safeJsonParse<T = any>(
  jsonString: string,
  defaultValue: T | null = null
): SafeJsonParseResult<T> {
  // 处理空值
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      success: false,
      data: defaultValue,
      error: '输入为空或不是字符串',
    };
  }

  // 处理空字符串
  if (jsonString.trim() === '') {
    return {
      success: false,
      data: defaultValue,
      error: '输入为空字符串',
    };
  }

  try {
    const parsed = JSON.parse(jsonString) as T;
    return {
      success: true,
      data: parsed,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      data: defaultValue,
      error: `解析错误: ${errorMessage}`,
    };
  }
}

/**
 * 安全地解析JSON字段（用于数据库字段）
 * @param value 数据库中的JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的数据或默认值
 */
export function safeParseDbField<T = any>(
  value: string | null | undefined,
  defaultValue: T
): T {
  if (!value) {
    return defaultValue;
  }

  const result = safeJsonParse<T>(value, defaultValue);
  return result.data ?? defaultValue;
}