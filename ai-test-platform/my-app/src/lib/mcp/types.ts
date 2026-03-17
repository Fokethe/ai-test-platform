/**
 * MCP Types - 临时类型定义
 * TODO: 需要完善实际类型定义
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute: (args: unknown) => Promise<unknown>;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

export class MCPValidationError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'MCPValidationError';
    this.code = code;
    this.details = details;
  }
}
