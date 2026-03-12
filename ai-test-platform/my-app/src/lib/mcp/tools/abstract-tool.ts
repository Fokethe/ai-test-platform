
/**
 * MCP Tool 抽象基类
 * 提供统一的工具实现模式，内置验证和错误处理
 */

import { MCPTool, MCPToolInfo, JSONSchema, MCPValidationError } from '../types';

export interface ToolExecutionContext {
  requestId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export abstract class AbstractTool implements MCPTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: JSONSchema;
  readonly outputSchema?: JSONSchema;

  // 执行工具逻辑（子类必须实现）
  protected abstract executeInternal(
    input: unknown,
    context: ToolExecutionContext
  ): Promise<unknown>;

  // 公共执行方法
  async execute(input: unknown): Promise<unknown> {
    const context: ToolExecutionContext = {
      requestId: this.generateRequestId(),
      timestamp: new Date(),
    };

    try {
      // 验证输入
      this.validateInput(input);
      
      // 执行工具逻辑
      const result = await this.executeInternal(input, context);
      
      return result;
    } catch (error) {
      // 统一错误处理
      throw this.normalizeError(error);
    }
  }

  // 输入验证
  protected validateInput(input: unknown): void {
    if (!input || typeof input !== 'object') {
      throw new MCPValidationError(
        'INVALID_INPUT',
        'Input must be an object',
        { input }
      );
    }

    const schema = this.inputSchema;
    const inputObj = input as Record<string, unknown>;

    // 检查必填字段
    if (schema.required && schema.required.length > 0) {
      for (const field of schema.required) {
        if (!(field in inputObj)) {
          throw new MCPValidationError(
            'MISSING_REQUIRED_FIELD',
            `Missing required field: ${field}`,
            { field }
          );
        }
      }
    }
  }

  // 获取工具信息
  getToolInfo(): MCPToolInfo {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
    };
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 标准化错误
  private normalizeError(error: unknown): Error {
    if (error instanceof MCPValidationError) {
      return error;
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}

// 文件工具基类
export abstract class AbstractFileTool extends AbstractTool {
  // 验证文件路径
  protected validateFilePath(filePath: string, allowedExtensions: string[]): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new MCPValidationError(
        'INVALID_FILE_PATH',
        'File path must be a non-empty string',
        { filePath }
      );
    }

    const extension = filePath.toLowerCase().split('.').pop();
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new MCPValidationError(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`,
        { filePath, extension }
      );
    }
  }
}