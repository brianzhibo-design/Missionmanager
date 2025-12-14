/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// 自定义错误类
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 预定义错误
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource}不存在`, 404, 'NOT_FOUND'),

  unauthorized: (message = '未授权访问') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message = '无权限执行此操作') =>
    new AppError(message, 403, 'FORBIDDEN'),

  badRequest: (message: string, details?: any) =>
    new AppError(message, 400, 'BAD_REQUEST', details),

  conflict: (message: string) =>
    new AppError(message, 409, 'CONFLICT'),

  validation: (details: any) =>
    new AppError('输入验证失败', 400, 'VALIDATION_ERROR', details),

  internal: (message = '服务器内部错误') =>
    new AppError(message, 500, 'INTERNAL_ERROR'),
};

// 错误处理中间件
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // 默认错误信息
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = '服务器内部错误';
  let details = undefined;

  // 处理 AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // 处理 Prisma 错误
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = '数据已存在';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = '记录不存在';
    }
  }
  // 处理 JWT 错误
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = '无效的令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = '令牌已过期';
  }

  // 记录错误日志
  logger.error(`${code}: ${message}`, {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userId: (req as any).user?.id,
  });

  // 发送错误响应
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
    requestId: req.requestId,
  });
}

// 404 处理
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路径 ${req.method} ${req.path} 不存在`,
    },
    requestId: req.requestId,
  });
}
