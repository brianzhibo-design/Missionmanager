/**
 * 企业级日志服务
 * 使用 Winston 实现结构化日志
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// JSON 格式（生产环境）
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台彩色格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${message}${metaStr}`;
  })
);

// 传输器配置
const transports: winston.transport[] = [];

// 控制台输出
transports.push(
  new winston.transports.Console({
    format: NODE_ENV === 'development' ? consoleFormat : jsonFormat,
  })
);

// 生产环境：文件日志
if (NODE_ENV === 'production') {
  // 所有日志
  transports.push(
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'combined'),
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: jsonFormat,
    })
  );

  // 错误日志
  transports.push(
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'error'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: jsonFormat,
    })
  );
}

// 创建 logger 实例
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'taskflow-api' },
  transports,
});

// 便捷方法
export const log = {
  info: (message: string, meta?: object) => logger.info(message, meta),
  warn: (message: string, meta?: object) => logger.warn(message, meta),
  error: (message: string, meta?: object) => logger.error(message, meta),
  debug: (message: string, meta?: object) => logger.debug(message, meta),
  http: (message: string, meta?: object) => logger.http(message, meta),
};

// 请求日志辅助函数
export function logRequest(req: any, res: any, duration: number) {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  const userId = req.user?.id || 'anonymous';
  const requestId = req.requestId || '-';

  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger.log(level, `${method} ${originalUrl} ${statusCode} ${duration}ms`, {
    method,
    url: originalUrl,
    statusCode,
    duration,
    userId,
    requestId,
    ip,
    userAgent: req.get('user-agent'),
  });
}

