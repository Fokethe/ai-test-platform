
/**
 * PDF 文档解析工具
 * 基于 pdf-parse 库实现
 */

import { AbstractFileTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

// 输入类型定义
export interface PDFParserInput {
  file_path: string;
  options?: {
    start_page?: number;
    end_page?: number;
    extract_metadata?: boolean;
  };
}

// 输出类型定义
export interface PDFParserOutput {
  title?: string;
  author?: string;
  page_count: number;
  content: string;
  pages: Array<{
    page_number: number;
    text: string;
  }>;
  metadata: {
    creation_date?: string;
    modification_date?: string;
    producer?: string;
    creator?: string;
  };
}

export class PDFParserTool extends AbstractFileTool {
  readonly name = 'parse_pdf';
  readonly description = '解析PDF文档，提取结构化内容和元数据';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: 'PDF解析工具输入参数',
    properties: {
      file_path: {
        type: 'string',
        description: 'PDF文件路径',
      },
      options: {
        type: 'object',
        description: '解析选项',
        properties: {
          start_page: {
            type: 'integer',
            description: '起始页码（从1开始）',
            minimum: 1,
          },
          end_page: {
            type: 'integer',
            description: '结束页码',
            minimum: 1,
          },
          extract_metadata: {
            type: 'boolean',
            description: '是否提取元数据',
          },
        },
      },
    },
    required: ['file_path'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<PDFParserOutput> {
    const { file_path, options = {} } = input as PDFParserInput;

    // 验证文件类型
    this.validateFilePath(file_path, ['pdf']);

    try {
      // 动态导入 pdf-parse（避免在浏览器环境报错）
      const pdfParse = (await import('pdf-parse')).default;
      const fs = await import('fs/promises');
      
      // 读取PDF文件
      const buffer = await fs.readFile(file_path);
      
      // 解析PDF
      const result = await pdfParse(buffer, {
        max: options.end_page,
      });

      // 处理分页内容
      const pages: PDFParserOutput['pages'] = [];
      const text = result.text || '';
      
      // 按页分割文本（简单实现，实际可能需要更复杂的分页逻辑）
      const pageTexts = this.splitIntoPages(text, result.numpages);
      pageTexts.forEach((pageText, index) => {
        const pageNumber = index + 1;
        // 如果指定了起始页，跳过前面的页
        if (options.start_page && pageNumber < options.start_page) {
          return;
        }
        // 如果指定了结束页，跳过后面的页
        if (options.end_page && pageNumber > options.end_page) {
          return;
        }
        pages.push({
          page_number: pageNumber,
          text: pageText.trim(),
        });
      });

      // 提取元数据
      const metadata: PDFParserOutput['metadata'] = {};
      if (options.extract_metadata !== false) {
        metadata.creation_date = result.info?.CreationDate;
        metadata.modification_date = result.info?.ModDate;
        metadata.producer = result.info?.Producer;
        metadata.creator = result.info?.Creator;
      }

      return {
        title: result.info?.Title,
        author: result.info?.Author,
        page_count: result.numpages,
        content: text,
        pages,
        metadata,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${file_path}`);
      }
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 将文本按页分割（简单实现）
  private splitIntoPages(text: string, pageCount: number): string[] {
    if (pageCount <= 1) {
      return [text];
    }

    // 尝试按换页符分割
    const pages = text.split(/\f|\n\n\n+/);
    
    // 如果分割结果与页数不匹配，均匀分割
    if (pages.length !== pageCount) {
      const avgLength = Math.ceil(text.length / pageCount);
      const result: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        const start = i * avgLength;
        const end = Math.min((i + 1) * avgLength, text.length);
        result.push(text.slice(start, end));
      }
      return result;
    }

    return pages;
  }
}