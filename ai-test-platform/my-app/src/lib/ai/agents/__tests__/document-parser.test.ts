/**
 * DocumentParser Agent 单元测试
 * TDD 第 2 轮：需求文档上传 + 解析 API
 */

import { DocumentParser, ParsedDocument, DocumentType } from '../document-parser';

describe('DocumentParser', () => {
  let parser: DocumentParser;

  beforeEach(() => {
    parser = new DocumentParser();
  });

  describe('parse', () => {
    it('应该解析 TXT 文本文件', async () => {
      const content = Buffer.from('用户登录功能，支持手机号+验证码登录');
      const filename = 'requirement.txt';
      
      const result = await parser.parse(content, filename);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('txt');
      expect(result.content).toBe('用户登录功能，支持手机号+验证码登录');
      expect(result.rawText).toBeDefined();
    });

    it('应该识别文档类型', async () => {
      const testCases = [
        { filename: 'req.txt', expected: 'txt' },
        { filename: 'req.md', expected: 'md' },
        { filename: 'req.pdf', expected: 'pdf' },
        { filename: 'req.docx', expected: 'docx' },
        { filename: 'req.doc', expected: 'docx' },
        { filename: 'REQ.TXT', expected: 'txt' },
      ];

      for (const { filename, expected } of testCases) {
        const content = Buffer.from('test content');
        const result = await parser.parse(content, filename);
        expect(result.type).toBe(expected);
      }
    });

    it('应该处理不支持的文件类型', async () => {
      const content = Buffer.from('test');
      const filename = 'req.jpg';
      
      await expect(parser.parse(content, filename)).rejects.toThrow('不支持的文件类型');
    });

    it('应该处理空文件', async () => {
      const content = Buffer.from('');
      const filename = 'empty.txt';
      
      await expect(parser.parse(content, filename)).rejects.toThrow('文件内容为空');
    });

    it('应该提取文档标题', async () => {
      const content = Buffer.from('# 用户登录需求文档\n\n用户登录功能...');
      const filename = 'requirement.md';
      
      const result = await parser.parse(content, filename);
      
      expect(result.title).toBe('用户登录需求文档');
    });

    it('应该清理文档内容中的特殊字符', async () => {
      const content = Buffer.from('用户登录功能\t\n\n支持手机号登录\r\n');
      const filename = 'requirement.txt';
      
      const result = await parser.parse(content, filename);
      
      expect(result.content).not.toContain('\t');
      expect(result.content).not.toContain('\r');
    });
  });

  describe('detectDocumentType', () => {
    it('应该根据扩展名识别文档类型', () => {
      expect(parser.detectDocumentType('file.txt')).toBe('txt');
      expect(parser.detectDocumentType('file.md')).toBe('md');
      expect(parser.detectDocumentType('file.pdf')).toBe('pdf');
      expect(parser.detectDocumentType('file.docx')).toBe('docx');
      expect(parser.detectDocumentType('file.doc')).toBe('docx');
    });

    it('应该处理大写扩展名', () => {
      expect(parser.detectDocumentType('FILE.TXT')).toBe('txt');
      expect(parser.detectDocumentType('FILE.PDF')).toBe('pdf');
    });

    it('应该处理无扩展名文件', () => {
      expect(parser.detectDocumentType('README')).toBe('txt');
    });
  });

  describe('extractTitle', () => {
    it('应该从 Markdown 提取标题', () => {
      const content = '# 需求文档标题\n\n正文内容';
      expect(parser.extractTitle(content, 'md')).toBe('需求文档标题');
    });

    it('应该从第一行提取标题（无 Markdown 标题）', () => {
      const content = '需求文档标题\n正文内容';
      expect(parser.extractTitle(content, 'txt')).toBe('需求文档标题');
    });

    it('应该处理无标题文档', () => {
      const content = '正文内容';
      expect(parser.extractTitle(content, 'txt')).toBe('未命名文档');
    });
  });

  describe('cleanContent', () => {
    it('应该清理特殊字符', () => {
      const content = '内容\t\n\n内容\r\n';
      expect(parser.cleanContent(content)).toBe('内容\n\n内容\n');
    });

    it('应该移除多余空行', () => {
      const content = '第一行\n\n\n\n第二行';
      expect(parser.cleanContent(content)).toBe('第一行\n\n第二行');
    });
  });

  describe('validateFile', () => {
    it('应该验证文件大小', () => {
      const smallFile = Buffer.alloc(1024); // 1KB
      expect(() => parser.validateFile(smallFile, 'test.txt')).not.toThrow();
    });

    it('应该拒绝过大的文件', () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      expect(() => parser.validateFile(largeFile, 'test.txt')).toThrow('文件过大');
    });

    it('应该验证支持的文件类型', () => {
      expect(() => parser.validateFile(Buffer.from('test'), 'test.txt')).not.toThrow();
      expect(() => parser.validateFile(Buffer.from('test'), 'test.pdf')).not.toThrow();
    });

    it('应该拒绝不支持的文件类型', () => {
      expect(() => parser.validateFile(Buffer.from('test'), 'test.jpg')).toThrow('不支持的文件类型');
      expect(() => parser.validateFile(Buffer.from('test'), 'test.png')).toThrow('不支持的文件类型');
    });
  });
});
