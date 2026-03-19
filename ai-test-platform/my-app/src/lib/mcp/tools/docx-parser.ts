
/**
 * DOCX 文档解析工具
 * 基于 mammoth.js 实现
 */

import { AbstractFileTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

export interface DOCXParserInput {
  file_path: string;
  options?: {
    extract_headings?: boolean;
    extract_tables?: boolean;
    heading_style?: 'html' | 'markdown';
  };
}

export interface DOCXParserOutput {
  title?: string;
  headings: Array<{
    level: number;
    text: string;
  }>;
  content: string;
  tables: Array<{
    rows: number;
    columns: number;
    data: string[][];
  }>;
  structure: {
    paragraphs: number;
    word_count: number;
  };
}

export class DOCXParserTool extends AbstractFileTool {
  readonly name = 'parse_docx';
  readonly description = '解析Word文档，保留层级结构和表格';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: 'DOCX解析工具输入参数',
    properties: {
      file_path: {
        type: 'string',
        description: 'DOCX文件路径',
      },
      options: {
        type: 'object',
        description: '解析选项',
        properties: {
          extract_headings: {
            type: 'boolean',
            description: '是否提取标题层级',
          },
          extract_tables: {
            type: 'boolean',
            description: '是否提取表格',
          },
          heading_style: {
            type: 'string',
            description: '标题样式格式',
            enum: ['html', 'markdown'],
          },
        },
      },
    },
    required: ['file_path'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<DOCXParserOutput> {
    const { file_path, options = {} } = input as DOCXParserInput;

    this.validateFilePath(file_path, ['docx', 'doc']);

    try {
      const mammoth = await import('mammoth');
      const fs = await import('fs/promises');
      
      const buffer = await fs.readFile(file_path);
      
      // 使用 mammoth 提取 HTML
      const result = await mammoth.convertToHtml({ buffer });
      
      // 提取纯文本
      const textResult = await mammoth.extractRawText({ buffer });
      
      const content = textResult.value;
      const html = result.value;
      
      // 解析标题
      const headings: DOCXParserOutput['headings'] = [];
      if (options.extract_headings !== false) {
        const headingMatches = html.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi);
        if (headingMatches) {
          headingMatches.forEach(match => {
            const levelMatch = match.match(/<h([1-6])/i);
            const textMatch = match.match(/>([^<]*)</);
            if (levelMatch && textMatch) {
              headings.push({
                level: parseInt(levelMatch[1]),
                text: textMatch[1].trim(),
              });
            }
          });
        }
      }

      // 提取表格（简化实现）
      const tables: DOCXParserOutput['tables'] = [];
      if (options.extract_tables !== false) {
        const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
        if (tableMatches) {
          tableMatches.forEach(tableHtml => {
            const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
            if (rows.length > 0) {
              const data: string[][] = [];
              rows.forEach(row => {
                const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
                const rowData = cells.map(cell => {
                  return cell.replace(/<[^>]+>/g, '').trim();
                });
                data.push(rowData);
              });
              
              tables.push({
                rows: data.length,
                columns: data[0]?.length || 0,
                data,
              });
            }
          });
        }
      }

      // 统计信息
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim()).length;
      const wordCount = content.split(/\s+/).filter(w => w.trim()).length;

      return {
        title: headings[0]?.text,
        headings,
        content,
        tables,
        structure: {
          paragraphs,
          word_count: wordCount,
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${file_path}`);
      }
      throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}