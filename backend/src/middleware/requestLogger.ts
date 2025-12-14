/**
 * 请求日志中间件
 * 为每个请求添加追踪 ID 并记录日志
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest } from '../lib/logger';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

// 不记录日志的路径
const SKIP_PATHS = ['/health', '/health/live', '/health/ready', '/metrics', '/favicon.ico'];

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // 跳过某些路径
  if (SKIP_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // 添加请求 ID
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.startTime = Date.now();

  // 设置响应头
  res.setHeader('X-Request-ID', req.requestId);

  // 响应完成时记录日志
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logRequest(req, res, duration);
  });

  next();
}

