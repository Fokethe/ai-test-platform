/**
 * 需求文档上传 API 测试
 * TDD 第 3 轮：需求文档上传 + 解析 + 存储
 */

import { DocumentParser } from '@/lib/ai/agents/document-parser';
import { RequirementParser } from '@/lib/ai/agents/requirement-parser';

describe('DocumentParser + RequirementParser 集成', () => {
  let documentParser: DocumentParser;
  let requirementParser: RequirementParser;

  beforeEach(() => {
    documentParser = new DocumentParser();
    requirementParser = new RequirementParser();
  });

  describe('完整流程：文档解析 → 需求提取', () => {
    it('应该解析 TXT 并提取测试点', async () => {
      const content = Buffer.from('用户登录功能，支持手机号+验证码登录，6位验证码');
      const filename = 'requirement.txt';

      // 步骤1: 解析文档
      const parsedDoc = await documentParser.parse(content, filename);

      expect(parsedDoc.type).toBe('txt');
      expect(parsedDoc.content).toBe('用户登录功能，支持手机号+验证码登录，6位验证码');

      // 步骤2: 提取需求
      const parsedReq = await requirementParser.parse(parsedDoc.content);

      expect(parsedReq.features.length).toBeGreaterThan(0);
      expect(parsedReq.testPoints.length).toBeGreaterThan(0);
      expect(parsedReq.businessRules.some(r => r.type === 'length')).toBe(true);
    });

    it('应该解析 Markdown 并提取测试点', async () => {
      const content = Buffer.from('# 登录功能需求\n\n1. 支持手机号登录\n2. 支持验证码验证');
      const filename = 'requirement.md';

      const parsedDoc = await documentParser.parse(content, filename);
      expect(parsedDoc.title).toBe('登录功能需求');

      const parsedReq = await requirementParser.parse(parsedDoc.content);
      expect(parsedReq.features.length).toBeGreaterThanOrEqual(2);
    });

    it('应该处理复杂需求文档', async () => {
      const docContent = `
# 用户注册功能需求

## 功能描述
1. 支持邮箱注册
2. 密码长度要求8-20位
3. 验证码5分钟有效

## 业务规则
- 邮箱格式验证
- 密码必须包含大小写字母
- 每天最多发送10次验证码
      `;
      const content = Buffer.from(docContent);
      const filename = 'register.md';

      const parsedDoc = await documentParser.parse(content, filename);
      const parsedReq = await requirementParser.parse(parsedDoc.content);

      // 验证功能点提取
      expect(parsedReq.features.length).toBeGreaterThan(0);

      // 验证业务规则提取
      const hasLengthRule = parsedReq.businessRules.some(r => r.type === 'length');
      const hasTimeRule = parsedReq.businessRules.some(r => r.type === 'time');
      const hasLimitRule = parsedReq.businessRules.some(r => r.type === 'limit');

      expect(hasLengthRule).toBe(true);
      expect(hasTimeRule).toBe(true);
      expect(hasLimitRule).toBe(true);

      // 验证测试点生成
      expect(parsedReq.testPoints.length).toBeGreaterThan(0);
      expect(parsedReq.testPoints.some(p => p.priority === 'P0')).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理不支持的文件类型', async () => {
      const content = Buffer.from('test');
      const filename = 'image.jpg';

      await expect(documentParser.parse(content, filename)).rejects.toThrow('不支持的文件类型');
    });

    it('应该处理空文件', async () => {
      const content = Buffer.from('');
      const filename = 'empty.txt';

      await expect(documentParser.parse(content, filename)).rejects.toThrow('文件内容为空');
    });

    it('应该处理过短的需求内容', async () => {
      const content = Buffer.from('登录');
      const filename = 'short.txt';

      const parsedDoc = await documentParser.parse(content, filename);
      await expect(requirementParser.parse(parsedDoc.content)).rejects.toThrow('需求描述过短');
    });
  });

  describe('数据格式验证', () => {
    it('应该返回正确的数据结构', async () => {
      const content = Buffer.from('用户注册功能，支持邮箱注册，密码8-20位');
      const filename = 'register.txt';

      const parsedDoc = await documentParser.parse(content, filename);
      const parsedReq = await requirementParser.parse(parsedDoc.content);

      // 验证文档结构
      expect(parsedDoc).toMatchObject({
        type: expect.any(String),
        filename: expect.any(String),
        title: expect.any(String),
        content: expect.any(String),
        rawText: expect.any(String),
        size: expect.any(Number),
      });

      // 验证需求结构
      expect(parsedReq).toMatchObject({
        rawText: expect.any(String),
        features: expect.any(Array),
        businessRules: expect.any(Array),
        testPoints: expect.any(Array),
      });

      // 验证测试点结构
      if (parsedReq.testPoints.length > 0) {
        const firstPoint = parsedReq.testPoints[0];
        expect(firstPoint).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          priority: expect.any(String),
          relatedFeature: expect.any(String),
        });
      }
    });
  });
});
