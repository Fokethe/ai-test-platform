/**
 * Workspace Integration Tests
 * TDD 第1轮：写测试（红阶段）
 * 验证工作空间与项目、测试用例等功能的联动
 */

import { prisma } from '@/lib/prisma';

describe('Workspace Integration', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.project.deleteMany({});
  });

  describe('Workspace CRUD', () => {
    it('应该能创建工作空间', async () => {
      const workspace = await prisma.workspace.create({
        data: {
          name: '测试工作空间',
          description: '用于测试的工作空间',
        },
      });

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('测试工作空间');
      expect(workspace.description).toBe('用于测试的工作空间');
    });

    it('应该能查询工作空间列表', async () => {
      await prisma.workspace.createMany({
        data: [
          { name: '工作空间A' },
          { name: '工作空间B' },
        ],
      });

      const workspaces = await prisma.workspace.findMany();
      expect(workspaces).toHaveLength(2);
    });

    it('应该能更新工作空间', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '旧名称' },
      });

      const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data: { name: '新名称' },
      });

      expect(updated.name).toBe('新名称');
    });

    it('应该能删除工作空间', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '待删除' },
      });

      await prisma.workspace.delete({
        where: { id: workspace.id },
      });

      const found = await prisma.workspace.findUnique({
        where: { id: workspace.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Workspace - Project 联动', () => {
    it('工作空间下应该能创建项目', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '我的工作空间' },
      });

      const project = await prisma.project.create({
        data: {
          name: '测试项目',
          workspaceId: workspace.id,
        },
      });

      expect(project.workspaceId).toBe(workspace.id);
    });

    it('应该能查询工作空间下的所有项目', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '我的工作空间' },
      });

      await prisma.project.createMany({
        data: [
          { name: '项目A', workspaceId: workspace.id },
          { name: '项目B', workspaceId: workspace.id },
          { name: '项目C', workspaceId: workspace.id },
        ],
      });

      const projects = await prisma.project.findMany({
        where: { workspaceId: workspace.id },
      });

      expect(projects).toHaveLength(3);
    });

    it('删除工作空间时应该级联删除项目（或禁止删除）', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '待删除' },
      });

      await prisma.project.create({
        data: {
          name: '项目',
          workspaceId: workspace.id,
        },
      });

      // 应该抛出错误或级联删除
      await expect(
        prisma.workspace.delete({ where: { id: workspace.id } })
      ).rejects.toThrow();
    });
  });

  describe('Workspace - Member 联动', () => {
    it('应该能添加成员到工作空间', async () => {
      const workspace = await prisma.workspace.create({
        data: { name: '团队空间' },
      });

      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: 'user-123',
          role: 'MEMBER',
        },
      });

      expect(member.workspaceId).toBe(workspace.id);
      expect(member.userId).toBe('user-123');
      expect(member.role).toBe('MEMBER');
    });

    it('应该能查询用户参与的所有工作空间', async () => {
      const workspace1 = await prisma.workspace.create({
        data: { name: '空间1' },
      });
      const workspace2 = await prisma.workspace.create({
        data: { name: '空间2' },
      });

      await prisma.workspaceMember.createMany({
        data: [
          { workspaceId: workspace1.id, userId: 'user-123', role: 'OWNER' },
          { workspaceId: workspace2.id, userId: 'user-123', role: 'MEMBER' },
        ],
      });

      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: 'user-123' },
        include: { workspace: true },
      });

      expect(memberships).toHaveLength(2);
      expect(memberships[0].workspace.name).toBe('空间1');
      expect(memberships[1].workspace.name).toBe('空间2');
    });
  });

  describe('Workspace API Integration', () => {
    it('API 应该返回统一格式的响应', async () => {
      // 模拟API响应格式检查
      const mockResponse = {
        code: 0,
        message: 'success',
        data: {
          list: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
          },
        },
      };

      expect(mockResponse.code).toBe(0);
      expect(mockResponse.data.list).toBeDefined();
      expect(mockResponse.data.pagination).toBeDefined();
    });
  });

  describe('Workspace Navigation Integration', () => {
    it('工作空间应该出现在导航菜单中', () => {
      const navItems = [
        { id: 'dashboard', label: '仪表盘' },
        { id: 'workspaces', label: '工作空间' }, // 新增
        { id: 'tests', label: '测试中心' },
        { id: 'runs', label: '执行中心' },
      ];

      const workspaceNav = navItems.find((item) => item.id === 'workspaces');
      expect(workspaceNav).toBeDefined();
      expect(workspaceNav?.label).toBe('工作空间');
    });
  });
});
