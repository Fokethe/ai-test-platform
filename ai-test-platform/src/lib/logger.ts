/**
 * 结构化日志系统
 * 修复验收报告问题: 无日志系统
 */

import winston from 'winston';

const { combine, timestamp, json, errors, printf } = winston.format;

// 自定义格式
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// 创建日志目录
const logDir = process.env.LOG_DIR || 'logs';

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'ai-test-platform',
    environment: process.env.NODE_ENV || 'development',
  },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: `${logDir}/error.log`,
      level: 'error',
      format: json(),
    }),
    // 组合日志
    new winston.transports.File({
      filename: `${logDir}/combined.log`,
      format: json(),
    }),
  ],
  // 未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({ filename: `${logDir}/exceptions.log` }),
  ],
  // 未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({ filename: `${logDir}/rejections.log` }),
  ],
});

// 开发环境下输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), customFormat),
    })
  );
}

// 便捷的日志方法
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: Record<string, any>) => {
  logger.error(message, { error: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

// 请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
  });
  
  next();
};