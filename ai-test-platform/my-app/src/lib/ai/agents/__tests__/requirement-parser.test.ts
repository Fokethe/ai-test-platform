/**
 * RequirementParser Agent 单元测试
 * TDD 第 1 轮：需求解析 Agent 基础架构
 */

import { RequirementParser, ParsedRequirement, TestPoint } from '../requirement-parser';

describe('RequirementParser', () => {
  let parser: RequirementParser;

  beforeEach(() => {
    parser = new RequirementParser();
  });

  describe('parse', () => {
    it('应该解析简单需求并返回功能点列表', async () => {
      const requirement = '用户登录功能，支持手机号+验证码登录';
      
      const result = await parser.parse(requirement);
      
      expect(result).toBeDefined();
      expect(result.rawText).toBe(requirement);
      expect(result.features).toBeInstanceOf(Array);
      expect(result.features.length).toBeGreaterThan(0);
    });

    it('应该提取业务规则', async () => {
      const requirement = '验证码为6位数字，5分钟有效，每天最多发送10次';
      
      const result = await parser.parse(requirement);
      
      expect(result.businessRules).toBeInstanceOf(Array);
      expect(result.businessRules.length).toBeGreaterThan(0);
      // 应该包含长度规则
      expect(result.businessRules.some(r => r.type === 'length')).toBe(true);
      // 应该包含时间规则
      expect(result.businessRules.some(r => r.type === 'time')).toBe(true);
      // 应该包含次数限制
      expect(result.businessRules.some(r => r.type === 'limit')).toBe(true);
    });

    it('应该识别多个功能点', async () => {
      const requirement = `
        用户登录功能：
        1. 支持手机号+验证码登录
        2. 支持账号密码登录
        3. 支持第三方微信登录
        4. 登录后跳转到首页
      `;
      
      const result = await parser.parse(requirement);
      
      expect(result.features.length).toBeGreaterThanOrEqual(3);
    });

    it('应该生成测试点', async () => {
      const requirement = '用户登录功能，支持手机号+验证码登录，6位验证码';
      
      const result = await parser.parse(requirement);
      
      expect(result.testPoints).toBeInstanceOf(Array);
      expect(result.testPoints.length).toBeGreaterThan(0);
      
      // 每个测试点应该有基本属性
      const firstPoint = result.testPoints[0];
      expect(firstPoint).toHaveProperty('id');
      expect(firstPoint).toHaveProperty('name');
      expect(firstPoint).toHaveProperty('description');
      expect(firstPoint).toHaveProperty('priority');
    });

    it('应该为测试点分配优先级', async () => {
      const requirement = '用户登录功能，支持手机号+验证码登录';
      
      const result = await parser.parse(requirement);
      
      const priorities = result.testPoints.map(p => p.priority);
      expect(priorities).toEqual(
        expect.arrayContaining(['P0', 'P1', 'P2', 'P3'])
      );
    });

    it('应该处理空需求并抛出错误', async () => {
      await expect(parser.parse('')).rejects.toThrow('需求不能为空');
    });

    it('应该处理过短需求并抛出错误', async () => {
      await expect(parser.parse('登录')).rejects.toThrow('需求描述过短');
    });
  });

  describe('generateTestPoints', () => {
    it('应该基于功能点生成测试点', async () => {
      const features = ['手机号登录', '验证码验证'];
      
      const testPoints = await parser.generateTestPoints(features);
      
      expect(testPoints).toBeInstanceOf(Array);
      expect(testPoints.length).toBeGreaterThanOrEqual(features.length);
    });

    it('应该为每个功能点生成正向和反向测试点', async () => {
      const features = ['验证码登录'];
      
      const testPoints = await parser.generateTestPoints(features);
      
      const pointNames = testPoints.map(p => p.name);
      // 应该包含正常流程
      expect(pointNames.some(n => n.includes('正常') || n.includes('成功'))).toBe(true);
      // 应该包含异常流程
      expect(pointNames.some(n => n.includes('异常') || n.includes('失败') || n.includes('错误'))).toBe(true);
    });
  });

  describe('extractBusinessRules', () => {
    it('应该提取长度规则', async () => {
      const text = '验证码为6位数字';
      
      const rules = await parser.extractBusinessRules(text);
      
      const lengthRule = rules.find(r => r.type === 'length');
      expect(lengthRule).toBeDefined();
      expect(lengthRule?.value).toBe('6');
    });

    it('应该提取时间规则', async () => {
      const text = '验证码5分钟有效';
      
      const rules = await parser.extractBusinessRules(text);
      
      const timeRule = rules.find(r => r.type === 'time');
      expect(timeRule).toBeDefined();
    });

    it('应该提取数值范围规则', async () => {
      const text = '密码长度8-20位';
      
      const rules = await parser.extractBusinessRules(text);
      
      const rangeRule = rules.find(r => r.type === 'range');
      expect(rangeRule).toBeDefined();
    });
  });
});
