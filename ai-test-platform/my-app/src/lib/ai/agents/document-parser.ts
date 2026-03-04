/**
 * DocumentParser Agent
 * 文档解析 Agent - 解析上传的需求文档
 * 
 * 支持的格式：TXT, MD, PDF, DOCX
 * 核心职责：
 * 1. 识别文档类型
 * 2. 提取文档内容
 * 3. 清理和格式化文本
 * 4. 提取文档标题
 */

// 支持的文档类型
export type DocumentType = 'txt' | 'md' | 'pdf' | 'docx';

// 支持的文件扩展名映射
const SUPPORTED_EXTENSIONS: Record<string, DocumentType> = {
  'txt': 'txt',
  'md': 'md',
  'markdown': 'md',
  'pdf': 'pdf',
  'docx': 'docx',
  'doc': 'docx',
};

// 最大文件大小：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface ParsedDocument {
  type: DocumentType;
  filename: string;
  title: string;
  content: string;
  rawText: string;
  size: number;
}

export class DocumentParser {
  /**
   * 解析文档
   * @param content - 文件内容（Buffer）
   * @param filename - 文件名
   * @returns 解析后的文档结构
   */
  async parse(content: Buffer, filename: string): Promise<ParsedDocument> {
    // 验证文件
    this.validateFile(content, filename);

    // 检测文档类型
    const type = this.detectDocumentType(filename);

    // 转换为文本（目前仅支持文本格式）
    const rawText = content.toString('utf-8');

    // 清理内容
    const cleanedContent = this.cleanContent(rawText);

    // 提取标题
    const title = this.extractTitle(cleanedContent, type);

    return {
      type,
      filename,
      title,
      content: cleanedContent,
      rawText,
      size: content.length,
    };
  }

  /**
   * 验证文件
   * @param content - 文件内容
   * @param filename - 文件名
   * @throws 当文件无效时抛出错误
   */
  validateFile(content: Buffer, filename: string): void {
    // 检查文件内容是否为空
    if (!content || content.length === 0) {
      throw new Error('文件内容为空');
    }

    // 检查文件大小
    if (content.length > MAX_FILE_SIZE) {
      throw new Error(`文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // 检查文件类型
    const type = this.detectDocumentType(filename);
    if (!type) {
      throw new Error('不支持的文件类型');
    }
  }

  /**
   * 检测文档类型
   * @param filename - 文件名
   * @returns 文档类型
   */
  detectDocumentType(filename: string): DocumentType | null {
    // 检查是否包含扩展名
    if (!filename.includes('.')) {
      // 无扩展名，默认视为 txt
      return 'txt';
    }

    // 提取扩展名
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (!ext) {
      return 'txt';
    }

    // 查找支持的类型
    const type = SUPPORTED_EXTENSIONS[ext];
    return type || null;
  }

  /**
   * 提取文档标题
   * @param content - 文档内容
   * @param type - 文档类型
   * @returns 文档标题
   */
  extractTitle(content: string, type: DocumentType): string {
    // 尝试从 Markdown 标题提取
    if (type === 'md') {
      const mdTitleMatch = content.match(/^#\s+(.+)$/m);
      if (mdTitleMatch) {
        return mdTitleMatch[1].trim();
      }
    }

    // 从第一行提取（去除空白后）
    const firstLine = content.split('\n')[0]?.trim();
    // 第一行作为标题的条件：非空、长度适中、看起来像标题（不是普通正文）
    if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
      // 如果第一行很短（小于10字），可能是无标题文档
      if (firstLine.length < 10 && !firstLine.includes('需求') && !firstLine.includes('文档') && !firstLine.includes('功能')) {
        return '未命名文档';
      }
      return firstLine;
    }

    // 默认标题
    return '未命名文档';
  }

  /**
   * 清理文档内容
   * @param content - 原始内容
   * @returns 清理后的内容
   */
  cleanContent(content: string): string {
    // 先处理换行符和制表符
    let cleaned = content
      // 替换 \r\n 为 \n
      .replace(/\r\n/g, '\n')
      // 替换 \r 为 \n
      .replace(/\r/g, '\n')
      // 移除 \t
      .replace(/\t/g, '');

    // 记录是否以换行符结尾
    const endsWithNewline = cleaned.endsWith('\n');

    // 移除开头和结尾的空白（但保留末尾换行符）
    cleaned = cleaned.trim();

    // 如果原始内容以换行符结尾，恢复它
    if (endsWithNewline && !cleaned.endsWith('\n')) {
      cleaned += '\n';
    }

    // 移除多余空行（超过2个连续换行变为2个）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 移除行尾空格
    cleaned = cleaned.replace(/[ \t]+$/gm, '');

    return cleaned;
  }
}
