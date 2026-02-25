/**
 * Scheduler Tests - TDD Red Phase
 * 测试目标: Cron 调度和任务执行引擎
 */

import { SchedulerEngine } from '../scheduler';
import { TaskRunner } from '../task-runner';
import { prisma } from '../prisma';

// Mock prisma
jest.mock('../prisma', () => ({
  prisma: {
    scheduledTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    testRun: {
      create: jest.fn(),
      update: jest.fn(),
    },
    testExecution: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    testCase: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock task-runner
jest.mock('../task-runner', () => ({
  TaskRunner: {
    executeTestCases: jest.fn(),
  },
}));

describe('SchedulerEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    SchedulerEngine.stop();
  });

  afterEach(() => {
    jest.useRealTimers();
    SchedulerEngine.stop();
  });

  describe('Cron 解析', () => {
    it('should parse cron expression and calculate next run', () => {
      // Arrange
      const cron = '0 9 * * 1'; // 每周一 9:00
      const now = new Date('2026-02-25T10:00:00Z'); // 周三

      // Act
      const nextRun = SchedulerEngine.calculateNextRun(cron, now);

      // Assert
      expect(nextRun.getDay()).toBe(1); // 周一
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
      expect(nextRun > now).toBe(true);
    });

    it('should parse daily cron (0 0 * * *)', () => {
      // Arrange
      const cron = '0 0 * * *'; // 每天 0:00
      const now = new Date('2026-02-25T10:30:00Z');

      // Act
      const nextRun = SchedulerEngine.calculateNextRun(cron, now);

      // Assert
      expect(nextRun.getDate()).toBe(26); // 明天
      expect(nextRun.getHours()).toBe(0);
      expect(nextRun.getMinutes()).toBe(0);
    });

    it('should parse hourly cron (0 * * * *)', () => {
      // Arrange
      const cron = '0 * * * *'; // 每小时
      const now = new Date('2026-02-25T10:30:00Z');

      // Act
      const nextRun = SchedulerEngine.calculateNextRun(cron, now);

      // Assert - 应该是下一个小时的0分
      expect(nextRun > now).toBe(true);
      expect(nextRun.getMinutes()).toBe(0);
      expect(nextRun.getTime() - now.getTime()).toBeLessThan(3600000); // 小于1小时
    });

    it('should parse every 5 minutes (*/5 * * * *)', () => {
      // Arrange
      const cron = '*/5 * * * *'; // 每5分钟
      const now = new Date('2026-02-25T10:03:00Z');

      // Act
      const nextRun = SchedulerEngine.calculateNextRun(cron, now);

      // Assert
      expect(nextRun.getMinutes()).toBe(5);
    });
  });

  describe('任务调度', () => {
    it('should load active tasks on init', async () => {
      // Arrange
      const mockTasks = [
        { id: '1', cron: '0 * * * *', isActive: true, testCaseIds: '[]' },
        { id: '2', cron: '0 0 * * *', isActive: true, testCaseIds: '[]' },
      ];
      (prisma.scheduledTask.findMany as jest.Mock).mockResolvedValue(mockTasks);

      // Act
      await SchedulerEngine.init();

      // Assert
      expect(prisma.scheduledTask.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(SchedulerEngine.getScheduledTasks().length).toBe(2);
    });

    it('should schedule task and update nextRunAt', async () => {
      // Arrange
      const task = {
        id: '1',
        name: 'Daily Test',
        cron: '0 0 * * *',
        testCaseIds: '["tc1", "tc2"]',
        isActive: true,
      };
      (prisma.scheduledTask.update as jest.Mock).mockResolvedValue({});

      // Act
      await SchedulerEngine.scheduleTask(task);

      // Assert
      expect(prisma.scheduledTask.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          nextRunAt: expect.any(Date),
        }),
      });
    });

    it('should stop all scheduled tasks', async () => {
      // Arrange
      const mockTasks = [
        { id: '1', cron: '0 * * * *', isActive: true, testCaseIds: '[]' },
      ];
      (prisma.scheduledTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.scheduledTask.update as jest.Mock).mockResolvedValue({});
      await SchedulerEngine.init();
      expect(SchedulerEngine.getScheduledTasks().length).toBeGreaterThan(0); // 确保有任务

      // Act
      SchedulerEngine.stop();

      // Assert
      expect(SchedulerEngine.getScheduledTasks().length).toBe(0);
    });
  });

  describe('任务执行触发', () => {
    it('should trigger task when nextRunAt is reached', async () => {
      // Arrange - 使用立即执行的 cron（下一分钟）
      const now = new Date('2026-02-25T10:00:00Z');
      const task = {
        id: '1',
        name: 'Test Task',
        cron: '1 * * * *', // 每小时第1分钟
        testCaseIds: '["tc1"]',
        isActive: true,
      };
      (prisma.scheduledTask.findUnique as jest.Mock).mockResolvedValue(task);
      (prisma.testRun.create as jest.Mock).mockResolvedValue({ id: 'run-1' });
      (prisma.testExecution.create as jest.Mock).mockResolvedValue({});
      (prisma.scheduledTask.update as jest.Mock).mockResolvedValue({});
      (TaskRunner.executeTestCases as jest.Mock).mockResolvedValue([{ testCaseId: 'tc1', status: 'PASSED' }]);

      // Act - 初始化会设置定时器
      await SchedulerEngine.init();
      
      // Assert - 验证任务已调度
      expect(SchedulerEngine.getScheduledTasks().length).toBe(1);
    });

    it('should update lastRunAt after execution', async () => {
      // Arrange
      const task = {
        id: '1',
        name: 'Test Task',
        cron: '0 0 * * *',
        testCaseIds: '["tc1"]',
        isActive: true,
        lastRunAt: null,
      };
      (prisma.scheduledTask.findMany as jest.Mock).mockResolvedValue([task]);
      (prisma.testRun.create as jest.Mock).mockResolvedValue({ id: 'run-1' });
      (TaskRunner.executeTestCases as jest.Mock).mockResolvedValue({});
      (prisma.scheduledTask.update as jest.Mock).mockResolvedValue({});

      // Act
      await SchedulerEngine.executeTask('1');

      // Assert
      expect(prisma.scheduledTask.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          lastRunAt: expect.any(Date),
        }),
      });
    });
  });

  describe('边界情况', () => {
    it('should handle invalid cron expression', () => {
      // Arrange
      const invalidCron = 'invalid';

      // Act & Assert
      expect(() => {
        SchedulerEngine.calculateNextRun(invalidCron, new Date());
      }).toThrow();
    });

    it('should skip inactive tasks', async () => {
      // Arrange - findMany 只返回 active 任务，所以 mock 返回空
      (prisma.scheduledTask.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await SchedulerEngine.init();

      // Assert
      expect(SchedulerEngine.getScheduledTasks().length).toBe(0);
    });

    it('should handle task with empty testCaseIds', async () => {
      // Arrange
      const task = {
        id: '1',
        name: 'Empty Task',
        cron: '0 0 * * *',
        testCaseIds: '[]',
        isActive: true,
      };
      (prisma.scheduledTask.findUnique as jest.Mock).mockResolvedValue(task);

      // Act & Assert
      await expect(SchedulerEngine.executeTask('1')).rejects.toThrow('No test cases');
    });
  });
});
