/**
 * Scheduler Engine - 定时任务调度引擎
 */

import { prisma } from './prisma';
import { TaskRunner } from './task-runner';

interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  testCaseIds: string;
  isActive: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
}

interface TaskTimer {
  taskId: string;
  timeoutId: NodeJS.Timeout;
}

/**
 * Cron 解析器 - 支持基础 Cron 表达式
 */
class CronParser {
  /**
   * 解析 Cron 表达式并计算下次执行时间
   * 支持格式: * * * * * (分 时 日 月 周)
   */
  static getNextRun(cron: string, from: Date = new Date()): Date {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const next = new Date(from);
    next.setSeconds(0, 0);

    // 简单策略：从当前时间开始递增，找到匹配的时间
    for (let i = 0; i < 366 * 24 * 60; i++) {
      next.setMinutes(next.getMinutes() + 1);

      if (this.matches(next, minute, hour, dayOfMonth, month, dayOfWeek)) {
        return next;
      }
    }

    throw new Error('Could not calculate next run time');
  }

  /**
   * 检查时间是否匹配 Cron 表达式
   */
  private static matches(
    date: Date,
    minute: string,
    hour: string,
    dayOfMonth: string,
    month: string,
    dayOfWeek: string
  ): boolean {
    return (
      this.fieldMatches(date.getMinutes(), minute) &&
      this.fieldMatches(date.getHours(), hour) &&
      this.fieldMatches(date.getDate(), dayOfMonth) &&
      this.fieldMatches(date.getMonth() + 1, month) &&
      this.fieldMatches(date.getDay(), dayOfWeek)
    );
  }

  /**
   * 检查字段是否匹配
   */
  private static fieldMatches(value: number, pattern: string): boolean {
    if (pattern === '*') return true;

    // 处理步长 */n
    if (pattern.startsWith('*/')) {
      const step = parseInt(pattern.slice(2), 10);
      return value % step === 0;
    }

    // 处理范围 n-m
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      return value >= start && value <= end;
    }

    // 处理列表 n,m
    if (pattern.includes(',')) {
      const values = pattern.split(',').map(Number);
      return values.includes(value);
    }

    // 精确匹配
    return value === parseInt(pattern, 10);
  }
}

/**
 * 调度引擎
 */
class SchedulerEngineClass {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * 计算下次执行时间
   */
  calculateNextRun(cron: string, from: Date = new Date()): Date {
    return CronParser.getNextRun(cron, from);
  }

  /**
   * 初始化调度引擎 - 加载所有活跃任务
   */
  async init(): Promise<void> {
    if (this.isRunning) {
      this.stop();
    }

    const tasks = await prisma.scheduledTask.findMany({
      where: { isActive: true },
    });

    for (const task of tasks) {
      this.scheduleTask(task);
    }

    this.isRunning = true;
    console.log(`[Scheduler] Initialized with ${tasks.length} tasks`);
  }

  /**
   * 调度单个任务
   */
  async scheduleTask(task: ScheduledTask): Promise<void> {
    // 清除现有定时器
    this.cancelTask(task.id);

    try {
      // 计算下次执行时间
      const nextRun = this.calculateNextRun(task.cron);
      
      // 更新数据库
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { nextRunAt: nextRun },
      });

      // 设置定时器
      const delay = nextRun.getTime() - Date.now();
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          this.executeTask(task.id);
        }, delay);

        this.timers.set(task.id, timeoutId);
      }

      console.log(`[Scheduler] Task "${task.name}" scheduled for ${nextRun.toISOString()}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to schedule task ${task.id}:`, error);
    }
  }

  /**
   * 取消任务调度
   */
  cancelTask(taskId: string): void {
    const timeoutId = this.timers.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timers.delete(taskId);
    }
  }

  /**
   * 执行任务
   */
  async executeTask(taskId: string): Promise<void> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.isActive) {
      console.log(`[Scheduler] Task ${taskId} not found or inactive`);
      return;
    }

    const testCaseIds = JSON.parse(task.testCaseIds || '[]');
    if (testCaseIds.length === 0) {
      throw new Error('No test cases assigned to task');
    }

    console.log(`[Scheduler] Executing task "${task.name}" with ${testCaseIds.length} test cases`);

    // 创建测试运行记录
    const testRun = await prisma.testRun.create({
      data: {
        name: `${task.name} - 定时执行`,
        status: 'RUNNING',
        totalCount: testCaseIds.length,
      },
    });

    // 创建测试执行记录
    for (const testCaseId of testCaseIds) {
      await prisma.testExecution.create({
        data: {
          testCaseId,
          runId: testRun.id,
          status: 'PENDING',
        },
      });
    }

    // 异步执行测试（不阻塞）
    TaskRunner.executeTestCases(testCaseIds, testRun.id)
      .then(async (results) => {
        const passed = results.filter((r) => r.status === 'PASSED').length;
        const failed = results.filter((r) => r.status === 'FAILED').length;
        
        await prisma.testRun.update({
          where: { id: testRun.id },
          data: {
            status: failed === 0 ? 'COMPLETED' : 'COMPLETED_WITH_FAILURES',
            passedCount: passed,
            failedCount: failed,
            completedAt: new Date(),
          },
        });

        console.log(`[Scheduler] Task "${task.name}" completed: ${passed} passed, ${failed} failed`);
      })
      .catch((error) => {
        console.error(`[Scheduler] Task "${task.name}" failed:`, error);
      });

    // 更新任务执行时间
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRunAt: new Date(),
      },
    });

    // 重新调度下次执行
    this.scheduleTask(task);
  }

  /**
   * 停止所有调度
   */
  stop(): void {
    for (const [taskId, timeoutId] of this.timers) {
      clearTimeout(timeoutId);
      console.log(`[Scheduler] Cancelled task ${taskId}`);
    }
    this.timers.clear();
    this.isRunning = false;
  }

  /**
   * 获取已调度任务列表
   */
  getScheduledTasks(): string[] {
    return Array.from(this.timers.keys());
  }
}

// 导出单例
export const SchedulerEngine = new SchedulerEngineClass();
