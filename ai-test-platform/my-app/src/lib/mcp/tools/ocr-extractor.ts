
/**
 * OCR 图片文字识别工具
 * 基于 tesseract.js 实现
 */

import { AbstractFileTool, ToolExecutionContext } from './abstract-tool';
import { JSONSchema } from '../types';

export interface OCRExtractorInput {
  image_path: string;
  options?: {
    language?: string;
    enhance?: boolean;
    region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface OCRExtractorOutput {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  language: string;
}

export class OCRExtractorTool extends AbstractFileTool {
  readonly name = 'extract_ocr';
  readonly description = '从图片中提取文本，支持中英文识别';
  
  readonly inputSchema: JSONSchema = {
    type: 'object',
    description: 'OCR识别工具输入参数',
    properties: {
      image_path: {
        type: 'string',
        description: '图片文件路径',
      },
      options: {
        type: 'object',
        description: '识别选项',
        properties: {
          language: {
            type: 'string',
            description: '识别语言',
            default: 'chi_sim+eng',
          },
          enhance: {
            type: 'boolean',
            description: '是否进行图像增强',
            default: false,
          },
          region: {
            type: 'object',
            description: '指定识别区域',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
        },
      },
    },
    required: ['image_path'],
  };

  protected async executeInternal(
    input: unknown,
    _context: ToolExecutionContext
  ): Promise<OCRExtractorOutput> {
    const { image_path, options = {} } = input as OCRExtractorInput;

    // 验证图片格式
    this.validateFilePath(image_path, ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp']);

    try {
      // 动态导入 tesseract.js
      const { createWorker } = await import('tesseract.js');
      
      const language = options.language || 'chi_sim+eng';
      
      // 创建 worker
      const worker = await createWorker(language);
      
      // 执行识别
      const result = await worker.recognize(image_path);
      
      // 终止 worker
      await worker.terminate();
      
      // 提取单词级别的信息
      const words: OCRExtractorOutput['words'] = [];
      
      const data = result.data as any;
      if (data.words) {
        data.words.forEach((word: any) => {
          if (word.bbox) {
            words.push({
              text: word.text,
              confidence: word.confidence,
              bbox: {
                x0: word.bbox.x0,
                y0: word.bbox.y0,
                x1: word.bbox.x1,
                y1: word.bbox.y1,
              },
            });
          }
        });
      }

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words,
        language,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${image_path}`);
      }
      throw new Error(`OCR recognition failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}