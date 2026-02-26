/**
 * 需求存储测试
 * TDD 第 4 轮：数据库模型 + 存储
 */

import { prisma } from '@/lib/prisma';
import { DocumentParser } from '../document-parser';
import { RequirementParser } from '../requirement-parser';

describe('AiRequirement Storage', () => {
  let documentParser: DocumentParser;
  let requirementParser: RequirementParser;

  beforeEach(() => {
    documentParser = new DocumentParser();
    requirementParser = new RequirementParser();
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.testPoint.deleteMany({});
    await prisma.aiRequirement.deleteMany({});
  });

  describe('保存需求到数据库', () => {
    it('应该保存解析后的需求', async () => {
      const content = Buffer.from('用户登录功能，支持手机号+验证码登录，6位验证码');
      const filename = 'requirement.txt';

      // 解析文档
      const parsedDoc = await documentParser.parse(content, filename);
      const parsedReq = await requirementParser.parse(parsedDoc.content);

      // 保存到数据库
      const requirement = await prisma.aiRequirement.create({
        data: {
          title: parsedDoc.title,
          type: parsedDoc.type,
          filename: parsedDoc.filename,
          content: parsedDoc.content,
          rawText: parsedDoc.rawText,
          size: parsedDoc.size,
          projectId: 'test-project-id',
          features: JSON.stringify(parsedReq.features),
          businessRules: JSON.stringify(parsedReq.businessRules),
        },
      });

      expect(requirement.id).toBeDefined();
      expect(requirement.title).toBe(parsedDoc.title);
      expect(requirement.projectId).toBe('test-project-id');
    });

    it('应该保存测试点', async () => {
      const content = Buffer.from('用户登录功能，支持手机号登录');
      const filename = 'req.txt';

      const parsedDoc = await documentParser.parse(content, filename);
      const parsedReq = await requirementParser.parse(parsedDoc.content);

      // 先保存需求
      const requirement = await prisma.aiRequirement.create({
        data: {
          title: parsedDoc.title,
          type: parsedDoc.type,
          filename: parsedDoc.filename,
          content: parsedDoc.content,
          rawText: parsedDoc.rawText,
          size: parsedDoc.size,
          projectId: 'test-project-id',
          features: JSON.stringify(parsedReq.features),
          businessRules: JSON.stringify(parsedReq.businessRules),
        },
      });

      // 保存测试点
      const testPoints = await prisma.testPoint.createMany({
        data: parsedReq.testPoints.map((point, index) => ({
          id: point.id,
          name: point.name,
          description: point.description,
          priority: point.priority,
          relatedFeature: point.relatedFeature,
          requirementId: requirement.id,
          order: index,
        })),
      });

      expect(testPoints.count).toBe(parsedReq.testPoints.length);

      // 验证关联
      const savedPoints = await prisma.testPoint.findMany({
        where: { requirementId: requirement.id },
      });

      expect(savedPoints.length).toBe(parsedReq.testPoints.length);
    });
  });

  describe('查询需求', () => {
    it('应该按项目查询需求', async () => {
      // 创建测试数据
      await prisma.aiRequirement.create({
        data: {
          title: '需求1',
          type: 'txt',
          filename: 'req1.txt',
          content: '内容1',
          rawText: '内容1',
          size: 100,
          projectId: 'project-a',
          features: JSON.stringify(['功能1']),
          businessRules: JSON.stringify([]),
        },
      });

      await prisma.aiRequirement.create({
        data: {
          title: '需求2',
          type: 'txt',
          filename: 'req2.txt',
          content: '内容2',
          rawText: '内容2',
          size: 100,
          projectId: 'project-b',
          features: JSON.stringify(['功能2']),
          businessRules: JSON.stringify([]),
        },
      });

      const projectAReqs = await prisma.aiRequirement.findMany({
        where: { projectId: 'project-a' },
      });

      expect(projectAReqs.length).toBe(1);
      expect(projectAReqs[0].title).toBe('需求1');
    });

    it('应该查询需求及其测试点', async () => {
      const requirement = await prisma.aiRequirement.create({
        data: {
          title: '登录需求',
          type: 'txt',
          filename: 'login.txt',
          content: '登录功能',
          rawText: '登录功能',
          size: 100,
          projectId: 'test-project',
          features: JSON.stringify(['登录']),
          businessRules: JSON.stringify([]),
        },
      });

      await prisma.testPoint.createMany({
        data: [
          {
            id: 'TP-1',
            name: '正常登录',
            description: '测试正常登录流程',
            priority: 'P0',
            relatedFeature: '登录',
            requirementId: requirement.id,
            order: 0,
          },
          {
            id: 'TP-2',
            name: '异常登录',
            description: '测试异常登录处理',
            priority: 'P1',
            relatedFeature: '登录',
            requirementId: requirement.id,
            order: 1,
          },
        ],
      });

      const reqWithPoints = await prisma.aiRequirement.findUnique({
        where: { id: requirement.id },
        include: { testPoints: true },
      });

      expect(reqWithPoints).toBeDefined();
      expect(reqWithPoints?.testPoints.length).toBe(2);
    });
  });

  describe('更新需求', () => {
    it('应该更新需求内容', async () => {
      const requirement = await prisma.aiRequirement.create({
        data: {
          title: '原始标题',
          type: 'txt',
          filename: 'req.txt',
          content: '原始内容',
          rawText: '原始内容',
          size: 100,
          projectId: 'test-project',
          features: JSON.stringify(['功能1']),
          businessRules: JSON.stringify([]),
        },
      });

      const updated = await prisma.aiRequirement.update({
        where: { id: requirement.id },
        data: {
          title: '更新后的标题',
          content: '更新后的内容',
        },
      });

      expect(updated.title).toBe('更新后的标题');
      expect(updated.content).toBe('更新后的内容');
    });
  });

  describe('删除需求', () => {
    it('应该级联删除测试点', async () => {
      const requirement = await prisma.aiRequirement.create({
        data: {
          title: '待删除',
          type: 'txt',
          filename: 'delete.txt',
          content: '内容',
          rawText: '内容',
          size: 100,
          projectId: 'test-project',
          features: JSON.stringify([]),
          businessRules: JSON.stringify([]),
        },
      });

      await prisma.testPoint.create({
        data: {
          id: 'TP-DELETE',
          name: '测试点',
          description: '描述',
          priority: 'P0',
          relatedFeature: '功能',
          requirementId: requirement.id,
          order: 0,
        },
      });

      // 删除需求
      await prisma.aiRequirement.delete({
        where: { id: requirement.id },
      });

      // 验证测试点也被删除
      const remainingPoints = await prisma.testPoint.findMany({
        where: { requirementId: requirement.id },
      });

      expect(remainingPoints.length).toBe(0);
    });
  });
});
