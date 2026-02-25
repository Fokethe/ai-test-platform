import { prisma } from '@/lib/prisma';
import { LogType, LogLevel } from '@prisma/client';

interface LogOptions {
  type?: LogType;
  level?: LogLevel;
  userId?: string;
  action: string;
  target: string;
  message: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * 创建日志记录
 */
export async function createLog(options: LogOptions) {
  try {
    const log = await prisma.log.create({
      data: {
        type: options.type || 'SYSTEM',
        level: options.level || 'INFO',
        userId: options.userId,
        action: options.action,
        target: options.target,
        message: options.message,
        details: options.details ? JSON.stringify(options.details) : null,
        ip: options.ip,
        userAgent: options.userAgent,
      },
    });
    return log;
  } catch (error) {
    console.error('Failed to create log:', error);
    // 日志记录失败不应影响主业务流程
    return null;
  }
}

/**
 * 记录操作日志
 */
export async function logOperation(
  action: string,
  target: string,
  message: string,
  options?: Omit<LogOptions, 'type' | 'action' | 'target' | 'message'>
) {
  return createLog({
    type: 'OPERATION',
    action,
    target,
    message,
    ...options,
  });
}

/**
 * 记录系统日志
 */
export async function logSystem(
  action: string,
  target: string,
  message: string,
  options?: Omit<LogOptions, 'type' | 'action' | 'target' | 'message'>
) {
  return createLog({
    type: 'SYSTEM',
    action,
    target,
    message,
    ...options,
  });
}

/**
 * 记录执行日志
 */
export async function logExecution(
  action: string,
  target: string,
  message: string,
  options?: Omit<LogOptions, 'type' | 'action' | 'target' | 'message'>
) {
  return createLog({
    type: 'EXECUTION',
    action,
    target,
    message,
    ...options,
  });
}

/**
 * 记录错误日志
 */
export async function logError(
  action: string,
  target: string,
  message: string,
  error?: Error,
  options?: Omit<LogOptions, 'type' | 'level' | 'action' | 'target' | 'message'>
) {
  return createLog({
    type: 'SYSTEM',
    level: 'ERROR',
    action,
    target,
    message,
    details: error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        }
      : undefined,
    ...options,
  });
}
