/**
 * 认证中间件
 */
import { Request, Response, NextFunction } from 'express';
import { authService, JwtPayload } from '../services/authService';
import { AppError } from './errorHandler';

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * 认证中间件：必须登录
 * 从 Authorization header 中提取 Bearer Token 并验证
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供认证 Token', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7); // 去掉 "Bearer " 前缀
    const payload = authService.verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 可选认证中间件
 * 有 Token 就解析并设置 user，没有也放行
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.user = authService.verifyToken(token);
    }

    next();
  } catch {
    // Token 无效时不报错，只是不设置 user
    next();
  }
}

